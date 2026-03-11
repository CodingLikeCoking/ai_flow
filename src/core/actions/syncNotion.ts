import type { AiFlowConfig, NormalizedRecord } from "../types.js";
import { syncRecordsToNotion } from "../notion/syncService.js";
import { AiFlowDatabase, openDatabase } from "../db/database.js";

interface SyncNotionOptions {
  projectSlug?: string;
  db?: AiFlowDatabase;
  syncer?: (
    config: AiFlowConfig,
    records: NormalizedRecord[]
  ) => Promise<{ syncedCount: number; warnings: string[]; recordPageIds?: Record<string, string> }>;
}

export async function syncNotionRecords(
  config: AiFlowConfig,
  records: NormalizedRecord[],
  options: SyncNotionOptions = {}
): Promise<{ syncedCount: number; warnings: string[]; recordPageIds?: Record<string, string> }> {
  const syncer = options.syncer ?? syncRecordsToNotion;

  let effectiveRecords = records;
  if (effectiveRecords.length === 0) {
    const db = options.db ?? openDatabase(config);
    const shouldClose = !options.db;
    try {
      effectiveRecords = options.projectSlug
        ? db.listRecords(options.projectSlug, {}, 100_000, 0).items
        : db.allRecords();
    } finally {
      if (shouldClose) db.close();
    }
  }

  const result = await syncer(config, effectiveRecords);
  return {
    syncedCount: result.syncedCount,
    warnings: result.warnings,
    recordPageIds: result.recordPageIds
  };
}
