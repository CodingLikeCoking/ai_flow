import type { AiFlowConfig, NormalizedRecord } from "../types.js";
import { syncRecordsToNotion } from "../notion/syncService.js";

export async function syncNotionRecords(
  config: AiFlowConfig,
  records: NormalizedRecord[]
): Promise<{ syncedCount: number; warnings: string[] }> {
  const result = await syncRecordsToNotion(config, records);
  return {
    syncedCount: result.syncedCount,
    warnings: result.warnings
  };
}
