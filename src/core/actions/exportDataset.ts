import type { AiFlowConfig, NormalizedRecord } from "../types.js";
import { writeTextFile } from "../fs/fileIO.js";

export async function exportDataset(
  config: AiFlowConfig,
  records: NormalizedRecord[]
): Promise<void> {
  const conversations = `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;
  const patterns = `${records
    .flatMap((record) => record.reusablePatterns)
    .map((pattern) => JSON.stringify({ pattern }))
    .join("\n")}\n`;

  await Promise.all([
    writeTextFile(`${config.paths.datasetDir}/conversations.ndjson`, conversations),
    writeTextFile(`${config.paths.datasetDir}/patterns.ndjson`, patterns)
  ]);
}
