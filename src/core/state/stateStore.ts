import { join } from "node:path";

import type { AiFlowConfig } from "../types.js";
import { readJsonFile, writeJsonFile } from "../fs/fileIO.js";

export interface IngestionFileState {
  offset: number;
  size: number;
  mtimeMs: number;
  metadata?: Record<string, string>;
}

export interface IngestionState {
  version: number;
  files: Record<string, IngestionFileState>;
}

export async function loadIngestionState(config: AiFlowConfig): Promise<IngestionState> {
  const path = join(config.paths.stateDir, "ingestion-state.json");
  const saved = await readJsonFile<
    IngestionState | { offsets?: Record<string, number> } | null
  >(path);

  if (saved && "version" in saved && saved.version === 2 && "files" in saved) {
    return saved;
  }

  if (saved && "offsets" in saved) {
    return {
      version: 2,
      files: Object.fromEntries(
        Object.entries(saved.offsets ?? {}).map(([key, offset]) => [
          key,
          {
            offset,
            size: offset,
            mtimeMs: 0
          }
        ])
      )
    };
  }

  return {
    version: 2,
    files: {}
  };
}

export async function saveIngestionState(
  config: AiFlowConfig,
  state: IngestionState
): Promise<void> {
  const path = join(config.paths.stateDir, "ingestion-state.json");
  await writeJsonFile(path, state);
}
