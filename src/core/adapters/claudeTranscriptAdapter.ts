import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import readline from "node:readline";

import fg from "fast-glob";

import type { IngestionState } from "../state/stateStore.js";
import type { AdapterEvent, AiFlowConfig } from "../types.js";

interface ClaudeScanOptions {
  rootDir?: string;
  state?: IngestionState;
  maxBytesPerScanPass?: number;
}

export async function readClaudeTranscriptEvents(
  config: AiFlowConfig,
  options: ClaudeScanOptions = {}
): Promise<AdapterEvent[]> {
  const rootDir = options.rootDir ?? `${config.paths.homeDir}/.claude/transcripts`;
  const files = await fg("*.jsonl", { cwd: rootDir, absolute: true });
  const events: AdapterEvent[] = [];

  for (const file of files) {
    const fileStateKey = `claude:${file}`;
    const previous = options.state?.files[fileStateKey];
    const stats = await safeStat(file);
    if (!stats) {
      continue;
    }

    const shouldRestart = !previous || previous.size > stats.size || previous.mtimeMs > stats.mtimeMs;
    const startOffset = shouldRestart ? 0 : previous.offset;
    if (!shouldRestart && stats.size === previous.size) {
      continue;
    }

    const consumedOffset = await readJsonLines(
      file,
      startOffset,
      options.maxBytesPerScanPass,
      async (line) => {
      if (!line.trim()) {
          return;
      }

      const record = safeParse(line);
      if (!record) {
          return;
      }

      const event = mapClaudeRecordToEvent(record, file);
      if (event) {
        events.push(event);
      }
      }
    );
    const finalStats = await safeStat(file);

    if (options.state) {
      options.state.files[fileStateKey] = {
        offset: consumedOffset,
        size: consumedOffset,
        mtimeMs: finalStats?.mtimeMs ?? stats.mtimeMs
      };
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

async function safeStat(path: string): Promise<{ size: number; mtimeMs: number } | null> {
  try {
    const value = await stat(path);
    return {
      size: value.size,
      mtimeMs: value.mtimeMs
    };
  } catch {
    return null;
  }
}

async function readJsonLines(
  path: string,
  start: number,
  maxBytes: number | undefined,
  onLine: (line: string) => Promise<void> | void
): Promise<number> {
  const stream = createReadStream(path, {
    encoding: "utf8",
    start,
    end: typeof maxBytes === "number" ? start + maxBytes - 1 : undefined
  });
  const reader = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  try {
    for await (const line of reader) {
      await onLine(line);
    }
  } finally {
    reader.close();
    stream.destroy();
  }

  return start + stream.bytesRead;
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
