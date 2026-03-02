import { join } from "node:path";

import type { AiFlowConfig } from "../types.js";
import { readJsonFile, writeJsonFile } from "../fs/fileIO.js";

export interface IngestionState {
  offsets: Record<string, number>;
}

export async function loadIngestionState(config: AiFlowConfig): Promise<IngestionState> {
  const path = join(config.paths.stateDir, "ingestion-state.json");
  return (await readJsonFile<IngestionState>(path)) ?? { offsets: {} };
}

export async function saveIngestionState(
  config: AiFlowConfig,
  state: IngestionState
): Promise<void> {
  const path = join(config.paths.stateDir, "ingestion-state.json");
  await writeJsonFile(path, state);
}
