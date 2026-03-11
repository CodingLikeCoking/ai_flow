import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import readline from "node:readline";

import fg from "fast-glob";

import type { IngestionState } from "../state/stateStore.js";
import type { AdapterEvent, AiFlowConfig } from "../types.js";

interface CodexScanOptions {
  rootDir?: string;
  state?: IngestionState;
}

export async function readCodexEvents(
  config: AiFlowConfig,
  options: CodexScanOptions = {}
): Promise<AdapterEvent[]> {
  const rootDir = options.rootDir ?? `${config.paths.homeDir}/.codex/sessions`;
  const files = await fg("**/*.jsonl", { cwd: rootDir, absolute: true });
  const events: AdapterEvent[] = [];

  for (const file of files) {
    const fileStateKey = `codex:${file}`;
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

    let currentProjectPath = previous?.metadata?.projectPath ?? "";
    let currentSessionId = previous?.metadata?.sessionId ?? "unknown-session";

    for await (const line of readJsonLines(file, startOffset)) {
      if (!line.trim()) {
        continue;
      }

      const record = safeParse(line);
      if (!record) {
        continue;
      }

      const payload = asRecord(record.payload);

      if (record.type === "session_meta") {
        currentProjectPath = asString(payload?.cwd) ?? currentProjectPath;
        currentSessionId = asString(payload?.id) ?? currentSessionId;
        continue;
      }

      const event = mapCodexRecordToEvent(
        record,
        file,
        currentProjectPath,
        currentSessionId
      );
      if (event) {
        events.push(event);
      }
    }

    if (options.state) {
      options.state.files[fileStateKey] = {
        offset: stats.size,
        size: stats.size,
        mtimeMs: stats.mtimeMs,
        metadata: {
          projectPath: currentProjectPath,
          sessionId: currentSessionId
        }
      };
    }
  }

  return sortEvents(events);
}

function mapCodexRecordToEvent(
  record: Record<string, unknown>,
  sourcePath: string,
  projectPath: string,
  fallbackSessionId: string
): AdapterEvent | null {
  const timestamp = asString(record.timestamp) ?? new Date().toISOString();
  const outerPayload = asRecord(record.payload);
  const sessionId =
    asString(record.session_id) ??
    asString(outerPayload?.id) ??
    asString(outerPayload?.session_id) ??
    fallbackSessionId;
  const responsePayload = outerPayload;

  if (record.type === "event_msg" && responsePayload?.type === "agent_message") {
    return {
      agent: "codex",
      sessionId,
      projectPath,
      sourcePath,
      timestamp,
      role: "assistant",
      text: asString(responsePayload.message) ?? ""
    };
  }

  if (record.type === "event_msg" && responsePayload?.type === "agent_reasoning") {
    return {
      agent: "codex",
      sessionId,
      projectPath,
      sourcePath,
      timestamp,
      role: "system",
      text: asString(responsePayload.text) ?? ""
    };
  }

  if (record.type === "response_item") {
    const payload = asRecord(record.payload);
    if (payload?.type === "message") {
      const first = Array.isArray(payload.content) ? asRecord(payload.content[0]) : null;
      const text = first?.type === "output_text" ? asString(first.text) ?? "" : "";
      const role = payload.role === "user" ? "user" : "assistant";

      return {
        agent: "codex",
        sessionId,
        projectPath,
        sourcePath,
        timestamp,
        role,
        text
      };
    }
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

async function* readJsonLines(path: string, start = 0): AsyncGenerator<string> {
  const stream = createReadStream(path, {
    encoding: "utf8",
    start
  });
  const reader = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  try {
    for await (const line of reader) {
      yield line;
    }
  } finally {
    reader.close();
    stream.destroy();
  }
}

function safeParse(line: string): Record<string, unknown> | null {
  try {
    return JSON.parse(line) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, any> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, any>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function sortEvents(events: AdapterEvent[]): AdapterEvent[] {
  return [...events].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}
