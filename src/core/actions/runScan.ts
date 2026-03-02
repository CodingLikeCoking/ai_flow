import { basename } from "node:path";

import fg from "fast-glob";

import type {
  AdapterEvent,
  AiFlowConfig,
  BuildVsBuyOption,
  CaptureFidelity,
  NormalizedRecord,
  ProjectRegistryEntry,
  ScanResult
} from "../types.js";
import { collectAllAdapterEvents } from "../adapters/index.js";
import { deriveTaskSlug } from "../analysis/taskSlug.js";
import { assessTaskBoundary } from "../analysis/taskBoundary.js";
import { detectReusablePatterns } from "../analysis/patternDetector.js";
import { buildOnePromptNextTime } from "../analysis/onePromptNextTime.js";
import { getProjectPaths, slugifyProjectName } from "../fs/paths.js";
import { readProjectRegistryEntry } from "../registry/projectRegistry.js";
import { renderPlanMarkdown } from "../renderers/planRenderer.js";
import { renderPromptMarkdown } from "../renderers/promptRenderer.js";
import { renderSetupGuideMarkdown } from "../renderers/setupGuideRenderer.js";
import { writeTextFile } from "../fs/fileIO.js";
import { appendSuggestionsToMarkdown } from "../suggestions/suggestionQueue.js";
import { exportDataset } from "./exportDataset.js";
import { rebuildProjectStatus } from "./rebuildStatus.js";
import { writeGlobalProjectMirror } from "../mirror/globalMirror.js";
import { initProject } from "./initProject.js";
import { runBuildVsBuyResearch } from "../research/buildVsBuy.js";
import { syncRecordsToNotion } from "../notion/syncService.js";

export interface RunScanOptions {
  config: AiFlowConfig;
  events?: AdapterEvent[];
}

export async function runScan(options: RunScanOptions): Promise<ScanResult> {
  const events = options.events ?? (await collectAllAdapterEvents(options.config));
  const grouped = groupEvents(events);
  const writtenRecords: NormalizedRecord[] = [];
  const warnings: string[] = [];
  let suggestionsApplied = 0;

  for (const group of grouped) {
    if (!group.projectPath) {
      warnings.push(`Skipped ${group.key} because no project path could be determined.`);
      continue;
    }

    const projectEntry = await ensureProjectRegistration(options.config, group.projectPath);
    const record = buildNormalizedRecord(group.events, projectEntry);
    writtenRecords.push(record);

    const projectPaths = getProjectPaths(projectEntry.projectPath, projectEntry.projectSlug);
    const sequence = await nextSequence(
      record.kind === "PLAN" ? "plan-*.md" : "prompt-*.md",
      projectPaths.taskDir(record.taskSlug)
    );
    const fileName =
      record.kind === "PLAN"
        ? `plan-${String(sequence).padStart(3, "0")}.md`
        : `prompt-${String(sequence).padStart(3, "0")}.md`;
    const targetFile =
      record.kind === "PLAN"
        ? projectPaths.taskPlanFile(record.taskSlug, sequence)
        : projectPaths.taskPromptFile(record.taskSlug, sequence);
    const rendered =
      record.kind === "PLAN" ? renderPlanMarkdown(record) : renderPromptMarkdown(record);

    await writeTextFile(targetFile, rendered);

    const detected = detectReusablePatterns(record);
    if (detected.length > 0) {
      record.reusablePatterns.push(...detected.map((item) => item.summary));
      await appendSuggestionsToMarkdown(projectPaths.skillBacklogFile, detected);
      suggestionsApplied += detected.filter((item) => item.confidence >= 0.9).length;
    }

    await rebuildProjectStatus(
      options.config,
      projectEntry.projectName,
      projectEntry.projectPath,
      projectEntry.projectSlug,
      [record]
    );

    const notionResult = await syncRecordsToNotion(options.config, [record]);
    warnings.push(...notionResult.warnings);
    if (notionResult.setupGuide) {
      await writeTextFile(
        projectPaths.setupGuideFile(record.taskSlug, "notion"),
        renderSetupGuideMarkdown(notionResult.setupGuide)
      );
    }

    await writeGlobalProjectMirror(options.config, projectEntry.projectSlug, projectEntry.projectName, {
      projectStatus: renderPromptMarkdown({
        ...record,
        kind: "STATUS"
      }),
      timeline: `# Timeline\n\n- ${record.startedAt}: ${record.taskSlug}\n`,
      records: [{ fileName: `${record.taskSlug}-${fileName}`, contents: rendered }]
    });
  }

  await exportDataset(options.config, writtenRecords);

  return {
    scannedAt: new Date().toISOString(),
    recordsCreated: writtenRecords.length,
    recordsUpdated: 0,
    suggestionsApplied,
    warnings
  };
}

function groupEvents(events: AdapterEvent[]): Array<{ key: string; projectPath: string | null; events: AdapterEvent[] }> {
  const grouped = new Map<string, { key: string; projectPath: string | null; events: AdapterEvent[] }>();
  const fallbackProjectPath = getFallbackProjectPath();

  for (const event of events) {
    const key = `${event.agent}:${event.sessionId}`;
    const current = grouped.get(key) ?? {
      key,
      projectPath: event.projectPath ?? fallbackProjectPath,
      events: []
    };
    if (event.projectPath) {
      current.projectPath = event.projectPath;
    }
    current.events.push(event);
    grouped.set(key, current);
  }

  return [...grouped.values()].sort((left, right) => left.key.localeCompare(right.key));
}

async function ensureProjectRegistration(
  config: AiFlowConfig,
  projectPath: string
): Promise<ProjectRegistryEntry> {
  const projectName = basename(projectPath) || "Unknown Project";
  const projectSlug = slugifyProjectName(projectName);
  const existing = await readProjectRegistryEntry(config, projectSlug);

  if (existing) {
    return existing;
  }

  const result = await initProject({
    config,
    projectPath,
    projectName
  });

  return result.entry;
}

function getFallbackProjectPath(): string | null {
  const cwd = process.cwd();
  return cwd === "/" ? null : cwd;
}

function buildNormalizedRecord(
  events: AdapterEvent[],
  projectEntry: ProjectRegistryEntry
): NormalizedRecord {
  const sorted = [...events].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const userText = sorted
    .filter((event) => event.role === "user")
    .map((event) => event.text)
    .join("\n\n")
    .trim();
  const assistantText = sorted
    .filter((event) => event.role === "assistant")
    .map((event) => event.text)
    .join("\n\n")
    .trim();
  const taskSlug = deriveTaskSlug(sorted, projectEntry.projectSlug);
  const boundary = assessTaskBoundary(taskSlug, sorted);
  const kind = assistantText.includes("<proposed_plan>") ? "PLAN" : "PROMPT";
  const buildVsBuy = runBuildVsBuyResearch(userText);
  const captureFidelity = getCaptureFidelity(sorted);
  const summary = assistantText.split("\n").find((line) => line.trim()) ?? "No summary captured.";
  const configNeeded = inferConfigNeeds(userText, assistantText);
  const nextDirections = buildNextDirections(boundary, buildVsBuy);

  const record: NormalizedRecord = {
    recordId: `${projectEntry.projectSlug}-${sorted[0]?.agent ?? "agent"}-${sorted[0]?.sessionId ?? "session"}`,
    projectSlug: projectEntry.projectSlug,
    taskSlug,
    kind,
    agent: sorted[0]?.agent ?? "codex",
    captureFidelity,
    sessionId: sorted[0]?.sessionId ?? "unknown-session",
    sourcePath: sorted[0]?.sourcePath ?? "",
    startedAt: sorted[0]?.timestamp ?? new Date().toISOString(),
    endedAt: sorted.at(-1)?.timestamp ?? new Date().toISOString(),
    status: boundary.status,
    userText,
    assistantText,
    summary,
    filesChanged: [],
    deliverables: kind === "PLAN" ? ["plan"] : ["prompt-log"],
    configNeeded,
    buildVsBuy,
    reusablePatterns: [],
    onePromptNextTime: "",
    nextDirections,
    notionPageId: null
  };

  record.onePromptNextTime = buildOnePromptNextTime(record);
  return record;
}

function getCaptureFidelity(events: AdapterEvent[]): CaptureFidelity {
  return events.some((event) => event.metadata?.summaryOnly === true)
    ? "summary_fidelity"
    : "full_fidelity";
}

function inferConfigNeeds(userText: string, assistantText: string): string[] {
  const combined = `${userText}\n${assistantText}`;
  const configNeeded: string[] = [];

  if (/\.env|api key|token/i.test(combined)) {
    configNeeded.push("Document required environment variables");
  }

  if (/notion/i.test(combined)) {
    configNeeded.push("Configure Notion integration");
  }

  return configNeeded;
}

function buildNextDirections(
  boundary: { status: string },
  buildVsBuy: BuildVsBuyOption[]
): string[] {
  const directions = ["Review reusable patterns and promote stable ones into config."];
  if (boundary.status !== "resolved") {
    directions.unshift("Confirm whether the task is actually complete.");
  }
  if (buildVsBuy.length > 0) {
    directions.push("Review existing tools before building another new utility.");
  }
  return directions;
}

async function nextSequence(pattern: string, cwd: string): Promise<number> {
  const matches = await fg(pattern, { cwd, onlyFiles: true, suppressErrors: true });
  return matches.length + 1;
}
