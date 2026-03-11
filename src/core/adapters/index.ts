import type { AdapterEvent, AiFlowConfig } from "../types.js";
import type { IngestionState } from "../state/stateStore.js";
import { readClaudeTranscriptEvents } from "./claudeTranscriptAdapter.js";
import { readCodexEvents } from "./codexAdapter.js";
import { readCursorEvents } from "./cursorAdapter.js";

export async function collectAllAdapterEvents(
  config: AiFlowConfig,
  state?: IngestionState
): Promise<AdapterEvent[]> {
  const [codex, claude, cursor] = await Promise.all([
    readCodexEvents(config, { state }),
    readClaudeTranscriptEvents(config, { state }),
    readCursorEvents(config)
  ]);

  return [...codex, ...claude, ...cursor].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp)
  );
}
