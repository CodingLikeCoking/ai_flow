import { readFile } from "node:fs/promises";

import fg from "fast-glob";

import type { AdapterEvent, AiFlowConfig } from "../types.js";

interface CodexScanOptions {
  rootDir?: string;
}

export async function readCodexEvents(
  config: AiFlowConfig,
  options: CodexScanOptions = {}
): Promise<AdapterEvent[]> {
  const rootDir = options.rootDir ?? `${config.paths.homeDir}/.codex/sessions`;
  const files = await fg("**/*.jsonl", { cwd: rootDir, absolute: true });
  const events: AdapterEvent[] = [];

  for (const file of files) {
    const contents = await safeReadText(file);
    if (!contents) {
      continue;
    }

    let currentProjectPath = "";
    let currentSessionId = "unknown-session";

    for (const line of contents.split("\n")) {
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

function asRecord(value: unknown): Record<string, any> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, any>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function sortEvents(events: AdapterEvent[]): AdapterEvent[] {
  return [...events].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}
