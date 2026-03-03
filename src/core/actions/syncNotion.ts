import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { fileExists } from "../fs/fileIO.js";
import type { AiFlowConfig, NormalizedRecord } from "../types.js";
import { syncRecordsToNotion } from "../notion/syncService.js";

interface SyncNotionOptions {
  projectSlug?: string;
  syncer?: (
    config: AiFlowConfig,
    records: NormalizedRecord[]
  ) => Promise<{ syncedCount: number; warnings: string[] }>;
}

export async function syncNotionRecords(
  config: AiFlowConfig,
  records: NormalizedRecord[],
  options: SyncNotionOptions = {}
): Promise<{ syncedCount: number; warnings: string[] }> {
  const syncer = options.syncer ?? syncRecordsToNotion;
  const effectiveRecords =
    records.length > 0 ? records : await loadDatasetRecords(config, options.projectSlug);
  const result = await syncer(config, effectiveRecords);
  return {
    syncedCount: result.syncedCount,
    warnings: result.warnings
  };
}

async function loadDatasetRecords(
  config: AiFlowConfig,
  projectSlug?: string
): Promise<NormalizedRecord[]> {
  const datasetPath = join(config.paths.datasetDir, "conversations.ndjson");
  if (!(await fileExists(datasetPath))) {
    return [];
  }

  const contents = await readFile(datasetPath, "utf8");
  const records = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as NormalizedRecord);

  if (!projectSlug) {
    return records;
  }

  return records.filter((record) => record.projectSlug === projectSlug);
}
