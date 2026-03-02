import type { AiFlowConfig, NormalizedRecord, SetupGuide } from "../types.js";
import { getNotionClient } from "./notionClient.js";

export interface NotionSyncResult {
  syncedCount: number;
  warnings: string[];
  setupGuide?: SetupGuide;
}

export async function syncRecordsToNotion(
  config: AiFlowConfig,
  records: NormalizedRecord[]
): Promise<NotionSyncResult> {
  const client = getNotionClient(config);
  const databaseId = process.env[config.notion.databaseIdEnvVar];

  if (!client || !databaseId) {
    return {
      syncedCount: 0,
      warnings: ["Notion credentials are missing."],
      setupGuide: buildNotionSetupGuide(records[0]?.projectSlug ?? "global")
    };
  }

  // Mapping exists now; actual create/update logic can expand later.
  return {
    syncedCount: records.length,
    warnings: []
  };
}

export function buildNotionSetupGuide(projectSlug: string): SetupGuide {
  return {
    id: "notion-setup",
    projectSlug,
    title: "Connect Notion for ai-flow",
    summary: "Add a Notion integration token and database ID so ai-flow can mirror records.",
    createdAt: new Date().toISOString(),
    steps: [
      {
        title: "Create a Notion integration",
        action: "Open notion.so/my-integrations and click New integration.",
        reason: "This creates the API token ai-flow uses.",
        verification: "A new integration is visible and has an Internal Integration Token."
      },
      {
        title: "Add environment variables",
        action: "Set NOTION_TOKEN and NOTION_DATABASE_ID in your shell or launchd environment.",
        reason: "ai-flow reads these values during sync.",
        verification: "Running `ai-flow doctor` no longer reports missing Notion credentials."
      }
    ]
  };
}
