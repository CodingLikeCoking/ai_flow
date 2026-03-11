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
import { slugifyProjectName } from "../fs/paths.js";
import { runBuildVsBuyResearch } from "../research/buildVsBuy.js";
import { syncRecordsToNotion } from "../notion/syncService.js";
import { AiFlowDatabase, openDatabase } from "../db/database.js";
import { loadIngestionState, saveIngestionState } from "../state/stateStore.js";

export interface RunScanOptions {
  config: AiFlowConfig;
  events?: AdapterEvent[];
  db?: AiFlowDatabase;
  syncNotion?: typeof syncRecordsToNotion;
}

export async function runScan(options: RunScanOptions): Promise<ScanResult> {
  const db = options.db ?? openDatabase(options.config);
  const shouldCloseDb = !options.db;

  try {
    return await runScanWithDb(db, options);
  } finally {
    if (shouldCloseDb) db.close();
  }
}

async function runScanWithDb(
  db: AiFlowDatabase,
  options: RunScanOptions
): Promise<ScanResult> {
  const shouldTrackIngestion = !options.events;
  const ingestionState = shouldTrackIngestion ? await loadIngestionState(options.config) : null;
  const events =
    options.events ?? (await collectAllAdapterEvents(options.config, ingestionState ?? undefined));
  const grouped = groupEvents(events);
  const writtenRecords: NormalizedRecord[] = [];
  const warnings: string[] = [];
  let suggestionsApplied = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  const syncNotion = options.syncNotion ?? syncRecordsToNotion;

  for (const group of grouped) {
    if (!group.projectPath) {
      warnings.push(`Skipped ${group.key} because no project path could be determined.`);
      continue;
    }

    const projectEntry = ensureProjectRegistration(db, group.projectPath);
    const record = buildNormalizedRecord(group.events, projectEntry);

    const detected = detectReusablePatterns(record);
    if (detected.length > 0) {
      record.reusablePatterns.push(...detected.map((item) => item.summary));
      suggestionsApplied += detected.filter((item) => item.confidence >= 0.9).length;
    }

    const existing = db.getRecord(record.recordId);
    db.upsertRecord(record);
    writtenRecords.push(record);
    if (existing) {
      recordsUpdated += 1;
    } else {
      recordsCreated += 1;
    }

    const notionResult = await syncNotion(options.config, [record]);
    warnings.push(...notionResult.warnings);
    const notionPageId = notionResult.recordPageIds?.[record.recordId];
    if (notionPageId) {
      db.updateNotionPageId(record.recordId, notionPageId);
    }
  }

  if (ingestionState) {
    await saveIngestionState(options.config, ingestionState);
  }

  return {
    scannedAt: new Date().toISOString(),
    recordsCreated,
    recordsUpdated,
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

function ensureProjectRegistration(
  db: AiFlowDatabase,
  projectPath: string
): ProjectRegistryEntry {
  const projectName = projectPath.split("/").pop() || "Unknown Project";
  const projectSlug = slugifyProjectName(projectName);
  const existing = db.getProject(projectSlug);

  if (existing) return existing;

  const now = new Date().toISOString();
  const entry: ProjectRegistryEntry = {
    projectSlug,
    projectName,
    projectPath,
    createdAt: now,
    updatedAt: now
  };

  db.upsertProject(entry);
  return entry;
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
