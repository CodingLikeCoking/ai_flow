import { join } from "node:path";

import type { AiFlowConfig, NormalizedRecord } from "../types.js";
import { writeTextFile } from "../fs/fileIO.js";
import { AiFlowDatabase, openDatabase } from "../db/database.js";

export type CloneExportFormat = "openai" | "anthropic" | "ndjson";

export interface ExportCloneOptions {
  format?: CloneExportFormat;
  projectSlug?: string;
  agent?: string;
  since?: string;
  outputPath?: string;
}

export async function exportClone(
  config: AiFlowConfig,
  options: ExportCloneOptions = {},
  db?: AiFlowDatabase
): Promise<string> {
  const ownDb = db ?? openDatabase(config);
  const shouldClose = !db;

  try {
    const format = options.format ?? "openai";
    const records = getFilteredRecords(ownDb, options);
    const lines = records.map((r) => formatRecord(r, format));
    const output = lines.join("\n") + "\n";

    const ext = format === "ndjson" ? "ndjson" : "jsonl";
    const outputPath =
      options.outputPath ??
      join(config.paths.datasetDir, `clone-${format}-${timestamp()}.${ext}`);

    await writeTextFile(outputPath, output);
    return outputPath;
  } finally {
    if (shouldClose) ownDb.close();
  }
}

function getFilteredRecords(
  db: AiFlowDatabase,
  options: ExportCloneOptions
): NormalizedRecord[] {
  if (options.projectSlug) {
    const { items } = db.listRecords(options.projectSlug, {
      agent: options.agent,
      since: options.since
    }, 100_000, 0);
    return items;
  }

  let records = db.allRecords();

  if (options.agent) {
    records = records.filter((r) => r.agent === options.agent);
  }
  if (options.since) {
    records = records.filter((r) => r.endedAt >= options.since!);
  }

  return records;
}

function formatRecord(record: NormalizedRecord, format: CloneExportFormat): string {
  switch (format) {
    case "openai":
      return JSON.stringify({
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(record)
          },
          {
            role: "user",
            content: record.userText
          },
          {
            role: "assistant",
            content: record.assistantText
          }
        ]
      });

    case "anthropic":
      return JSON.stringify({
        system: buildSystemPrompt(record),
        messages: [
          { role: "user", content: record.userText },
          { role: "assistant", content: record.assistantText }
        ]
      });

    case "ndjson":
      return JSON.stringify(record);
  }
}

function buildSystemPrompt(record: NormalizedRecord): string {
  const parts = [
    `You are a digital clone acting as a ${record.agent} coding assistant.`,
    `Project: ${record.projectSlug}`,
    `Task: ${record.taskSlug}`
  ];

  if (record.reusablePatterns.length > 0) {
    parts.push(`Known patterns: ${record.reusablePatterns.join("; ")}`);
  }

  if (record.onePromptNextTime) {
    parts.push(`If this task recurs, the ideal prompt is: ${record.onePromptNextTime}`);
  }

  return parts.join("\n");
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
