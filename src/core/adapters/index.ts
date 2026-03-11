import type { AdapterEvent, AiFlowConfig } from "../types.js";
import type { IngestionState } from "../state/stateStore.js";
import { readClaudeTranscriptEvents } from "./claudeTranscriptAdapter.js";
import { readCodexEvents } from "./codexAdapter.js";
import { readCursorEvents } from "./cursorAdapter.js";

interface CollectAdapterEventsOptions {
  state?: IngestionState;
  maxBytesPerScanPass?: number;
}

export async function collectAllAdapterEvents(
  config: AiFlowConfig,
  options: CollectAdapterEventsOptions = {}
): Promise<AdapterEvent[]> {
  const [codex, claude, cursor] = await Promise.all([
    readCodexEvents(config, {
      state: options.state,
      maxBytesPerScanPass: options.maxBytesPerScanPass
    }),
    readClaudeTranscriptEvents(config, {
      state: options.state,
      maxBytesPerScanPass: options.maxBytesPerScanPass
    }),
    readCursorEvents(config)
  ]);

  return [...codex, ...claude, ...cursor].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp)
  );
}
