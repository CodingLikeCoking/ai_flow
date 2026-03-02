import { readFile } from "node:fs/promises";

import fg from "fast-glob";

import type { AdapterEvent, AiFlowConfig } from "../types.js";

interface ClaudeScanOptions {
  rootDir?: string;
}

export async function readClaudeTranscriptEvents(
  config: AiFlowConfig,
  options: ClaudeScanOptions = {}
): Promise<AdapterEvent[]> {
  const rootDir = options.rootDir ?? `${config.paths.homeDir}/.claude/transcripts`;
  const files = await fg("*.jsonl", { cwd: rootDir, absolute: true });
  const events: AdapterEvent[] = [];

  for (const file of files) {
    const contents = await safeReadText(file);
    if (!contents) {
      continue;
    }

    for (const line of contents.split("\n")) {
      if (!line.trim()) {
        continue;
      }

      const record = safeParse(line);
      if (!record) {
        continue;
      }

      const event = mapClaudeRecordToEvent(record, file);
      if (event) {
        events.push(event);
      }
    }
  }

  return events.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

function mapClaudeRecordToEvent(
  record: Record<string, unknown>,
  sourcePath: string
): AdapterEvent | null {
  const timestamp = asString(record.timestamp) ?? new Date().toISOString();
  const sessionId = asString(record.sessionId) ?? guessSessionIdFromPath(sourcePath);
  const projectPath = asString(record.project) ?? "";
  const type = asString(record.type) ?? "assistant";

  if (type === "user") {
    return {
      agent: "claude",
      sessionId,
      projectPath,
      sourcePath,
      timestamp,
      role: "user",
      text: asString(record.content) ?? ""
    };
  }

  if (type === "tool_use" || type === "tool_result") {
    return {
      agent: "claude",
      sessionId,
      projectPath,
      sourcePath,
      timestamp,
      role: "tool",
      text: JSON.stringify(record)
    };
  }

  if (type === "assistant" || type === "model") {
    return {
      agent: "claude",
      sessionId,
      projectPath,
      sourcePath,
      timestamp,
      role: "assistant",
      text: asString(record.content) ?? JSON.stringify(record.content ?? "")
    };
  }

  return null;
}

async function safeReadText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

function safeParse(line: string): Record<string, unknown> | null {
  try {
    return JSON.parse(line) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function guessSessionIdFromPath(path: string): string {
  const parts = path.split("/");
  const file = parts.at(-1) ?? "unknown";
  return file.replace(/\.jsonl$/, "");
}
