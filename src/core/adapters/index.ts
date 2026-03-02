import type { AdapterEvent, AiFlowConfig } from "../types.js";
import { readClaudeTranscriptEvents } from "./claudeTranscriptAdapter.js";
import { readCodexEvents } from "./codexAdapter.js";
import { readCursorEvents } from "./cursorAdapter.js";

export async function collectAllAdapterEvents(
  config: AiFlowConfig
): Promise<AdapterEvent[]> {
  const [codex, claude, cursor] = await Promise.all([
    readCodexEvents(config),
    readClaudeTranscriptEvents(config),
    readCursorEvents(config)
  ]);

  return [...codex, ...claude, ...cursor].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp)
  );
}
