import { readFile, readdir, stat } from "node:fs/promises";
import { join, basename } from "node:path";

import fg from "fast-glob";

import type { AiFlowConfig, NormalizedRecord, ProjectRegistryEntry } from "../types.js";
import { AiFlowDatabase } from "./database.js";
import { readJsonFile } from "../fs/fileIO.js";

export interface MigrationResult {
  projectsMigrated: number;
  recordsMigrated: number;
  recordsFromNdjson: number;
  warnings: string[];
}

export async function migrateToDatabase(
  db: AiFlowDatabase,
  config: AiFlowConfig
): Promise<MigrationResult> {
  const result: MigrationResult = {
    projectsMigrated: 0,
    recordsMigrated: 0,
    recordsFromNdjson: 0,
    warnings: []
  };

  const migratedIds = new Set<string>();

  await migrateProjectRegistry(db, config, result);
  await migrateNdjsonDataset(db, config, result, migratedIds);
  await migratePromptMarkdown(db, config, result, migratedIds);

  return result;
}

async function migrateProjectRegistry(
  db: AiFlowDatabase,
  config: AiFlowConfig,
  result: MigrationResult
): Promise<void> {
  const registryFiles = await fg("*.json", {
    cwd: config.paths.projectsDir,
    absolute: true,
    onlyFiles: true,
    suppressErrors: true
  });

  for (const file of registryFiles) {
    try {
      const entry = await readJsonFile<ProjectRegistryEntry>(file);
      if (entry?.projectSlug) {
        db.upsertProject(entry);
        result.projectsMigrated++;
      }
    } catch (err) {
      result.warnings.push(`Failed to read project registry ${file}: ${err}`);
    }
  }
}

async function migrateNdjsonDataset(
  db: AiFlowDatabase,
  config: AiFlowConfig,
  result: MigrationResult,
  migratedIds: Set<string>
): Promise<void> {
  const ndjsonPath = join(config.paths.datasetDir, "conversations.ndjson");

  try {
    await stat(ndjsonPath);
  } catch {
    return;
  }

  try {
    const contents = await readFile(ndjsonPath, "utf8");
    const lines = contents.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      try {
        const record = JSON.parse(line) as NormalizedRecord;
        if (record.recordId && !migratedIds.has(record.recordId)) {
          db.upsertRecord(record);
          migratedIds.add(record.recordId);
          result.recordsFromNdjson++;
        }
      } catch {
        result.warnings.push("Skipped malformed NDJSON line");
      }
    }
  } catch (err) {
    result.warnings.push(`Failed to read ${ndjsonPath}: ${err}`);
  }
}

async function migratePromptMarkdown(
  db: AiFlowDatabase,
  config: AiFlowConfig,
  result: MigrationResult,
  migratedIds: Set<string>
): Promise<void> {
  const projects = db.listProjects(1000, 0).items;

  for (const project of projects) {
    const promptDir = join(project.projectPath, "prompt");

    try {
      await stat(promptDir);
    } catch {
      continue;
    }

    const mdFiles = await fg("*/*.md", {
      cwd: promptDir,
      absolute: true,
      onlyFiles: true,
      suppressErrors: true
    });

    for (const file of mdFiles) {
      try {
        const contents = await readFile(file, "utf8");
        const record = parseMarkdownRecord(contents, project, file);
        if (record && !migratedIds.has(record.recordId)) {
          db.upsertRecord(record);
          migratedIds.add(record.recordId);
          result.recordsMigrated++;
        }
      } catch (err) {
        result.warnings.push(`Failed to parse ${file}: ${err}`);
      }
    }
  }
}

function parseMarkdownRecord(
  contents: string,
  project: ProjectRegistryEntry,
  filePath: string
): NormalizedRecord | null {
  const lines = contents.split("\n");
  const title = lines[0] ?? "";
  const isPrompt = title.includes("[AGENT]");
  const isPlan = title.includes("[PLAN]");
  if (!isPrompt && !isPlan) return null;

  const kind = isPlan ? "PLAN" : "PROMPT";
  const taskSlug = extractBetween(title, "—", "").trim() || basename(join(filePath, ".."));
  const agent = extractMetadata(lines, "Agent") || "codex";
  const sessionId = extractMetadata(lines, "Session ID") || "migrated";
  const timestamp = extractMetadata(lines, "Timestamp") || new Date().toISOString();
  const status = (extractMetadata(lines, "Status") || "resolved") as NormalizedRecord["status"];
  const fidelity = (extractMetadata(lines, "Capture Fidelity") || "full_fidelity") as NormalizedRecord["captureFidelity"];

  const userText = extractSection(lines, "User Prompt") || extractSection(lines, "Planning Q&A") || "";
  const assistantText = extractSection(lines, "Agent Response") || extractSection(lines, "Final Plan") || "";
  const summary = extractSection(lines, "What Happened") || extractSection(lines, "Assumptions") || "";
  const onePrompt = extractSection(lines, "One Prompt Next Time") || "";

  const recordId = `${project.projectSlug}-${agent}-${sessionId}`;

  return {
    recordId,
    projectSlug: project.projectSlug,
    taskSlug,
    kind: kind as NormalizedRecord["kind"],
    agent: agent as NormalizedRecord["agent"],
    captureFidelity: fidelity,
    sessionId,
    sourcePath: filePath,
    startedAt: timestamp,
    endedAt: timestamp,
    status,
    userText,
    assistantText,
    summary,
    filesChanged: extractListSection(lines, "Files Changed"),
    deliverables: [],
    configNeeded: extractListSection(lines, "Config Needed"),
    buildVsBuy: [],
    reusablePatterns: extractListSection(lines, "Reusable Pattern Candidates"),
    onePromptNextTime: onePrompt,
    nextDirections: extractListSection(lines, "Next Directions"),
    notionPageId: null
  };
}

function extractMetadata(lines: string[], key: string): string | null {
  for (const line of lines) {
    if (line.startsWith(`- ${key}:`)) {
      return line.slice(`- ${key}:`.length).trim();
    }
  }
  return null;
}

function extractSection(lines: string[], heading: string): string {
  const idx = lines.findIndex((l) => l.startsWith(`## ${heading}`));
  if (idx === -1) return "";
  const contentLines: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) break;
    contentLines.push(lines[i]);
  }
  return contentLines.join("\n").trim();
}

function extractListSection(lines: string[], heading: string): string[] {
  const text = extractSection(lines, heading);
  if (!text || text === "- None" || text === "- None captured") return [];
  return text
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());
}

function extractBetween(text: string, start: string, _end: string): string {
  const idx = text.indexOf(start);
  if (idx === -1) return "";
  return text.slice(idx + start.length);
}
