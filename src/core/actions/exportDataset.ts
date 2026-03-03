import type { AiFlowConfig } from "../types.js";
import { writeTextFile } from "../fs/fileIO.js";
import { AiFlowDatabase, openDatabase } from "../db/database.js";

export async function exportDataset(
  config: AiFlowConfig,
  _legacyRecords: unknown[],
  db?: AiFlowDatabase
): Promise<void> {
  const ownDb = db ?? openDatabase(config);
  const shouldClose = !db;

  try {
    const records = ownDb.allRecords();
    const conversations = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
    const patterns =
      records
        .flatMap((r) => r.reusablePatterns)
        .map((p) => JSON.stringify({ pattern: p }))
        .join("\n") + "\n";

    await Promise.all([
      writeTextFile(`${config.paths.datasetDir}/conversations.ndjson`, conversations),
      writeTextFile(`${config.paths.datasetDir}/patterns.ndjson`, patterns)
    ]);
  } finally {
    if (shouldClose) ownDb.close();
  }
}
