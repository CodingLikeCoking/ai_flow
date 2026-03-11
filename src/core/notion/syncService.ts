import type { AiFlowConfig, NormalizedRecord, SetupGuide } from "../types.js";
import { readJsonFile, writeJsonFile } from "../fs/fileIO.js";
import { getNotionClient } from "./notionClient.js";

export interface NotionSyncResult {
  syncedCount: number;
  warnings: string[];
  recordPageIds?: Record<string, string>;
  setupGuide?: SetupGuide;
}

export interface NotionSyncDependencies {
  client?: NotionClientLike | null;
  databaseId?: string | null;
}

interface NotionClientLike {
  databases: {
    retrieve(input: { database_id: string }): Promise<unknown>;
  };
  pages: {
    create(input: Record<string, unknown>): Promise<unknown>;
    update(input: Record<string, unknown>): Promise<unknown>;
  };
}

interface NotionSyncState {
  recordToPageId: Record<string, string>;
}

export async function syncRecordsToNotion(
  config: AiFlowConfig,
  records: NormalizedRecord[],
  dependencies: NotionSyncDependencies = {}
): Promise<NotionSyncResult> {
  const client = (dependencies.client ?? getNotionClient(config)) as NotionClientLike | null;
  const databaseId = dependencies.databaseId ?? process.env[config.notion.databaseIdEnvVar];

  if (!client || !databaseId) {
    return {
      syncedCount: 0,
      warnings: ["Notion credentials are missing."],
      setupGuide: buildNotionSetupGuide(records[0]?.projectSlug ?? "global")
    };
  }

  if (records.length === 0) {
    return {
      syncedCount: 0,
      warnings: []
    };
  }

  let schema: NotionPropertySchema;
  try {
    schema = await loadDatabaseSchema(client, databaseId);
  } catch (error) {
    return {
      syncedCount: 0,
      warnings: [`Notion database lookup failed: ${getErrorMessage(error)}`]
    };
  }

  const state = await readNotionSyncState(config);
  let stateChanged = false;
  let syncedCount = 0;
  const warnings: string[] = [];
  const recordPageIds: Record<string, string> = {};

  for (const record of records) {
    const pageId = state.recordToPageId[record.recordId] ?? record.notionPageId;
    const properties = buildRecordProperties(record, schema);

    try {
      if (pageId) {
        await client.pages.update({
          page_id: pageId,
          properties
        });
        recordPageIds[record.recordId] = pageId;
      } else {
        const created = await client.pages.create({
          parent: { database_id: databaseId },
          properties,
          children: buildRecordChildren(record)
        });
        const createdId = getCreatedPageId(created);
        if (createdId) {
          state.recordToPageId[record.recordId] = createdId;
          stateChanged = true;
          recordPageIds[record.recordId] = createdId;
        }
      }
      syncedCount += 1;
    } catch (error) {
      warnings.push(`Failed to sync ${record.recordId}: ${getErrorMessage(error)}`);
    }
  }

  if (stateChanged) {
    await writeNotionSyncState(config, state);
  }

  return {
    syncedCount,
    warnings,
    recordPageIds
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

type NotionPropertySchema = Record<string, { type?: string }>;

async function loadDatabaseSchema(
  client: NotionClientLike,
  databaseId: string
): Promise<NotionPropertySchema> {
  const response = await client.databases.retrieve({ database_id: databaseId });
  if (!isRecord(response) || !isRecord(response.properties)) {
    return {};
  }

  const schema: NotionPropertySchema = {};
  for (const [name, value] of Object.entries(response.properties)) {
    if (isRecord(value)) {
      schema[name] = {
        type: typeof value.type === "string" ? value.type : undefined
      };
    }
  }

  return schema;
}

async function readNotionSyncState(config: AiFlowConfig): Promise<NotionSyncState> {
  const saved = await readJsonFile<NotionSyncState>(`${config.paths.stateDir}/notion-sync-state.json`);
  return {
    recordToPageId: saved?.recordToPageId ?? {}
  };
}

async function writeNotionSyncState(
  config: AiFlowConfig,
  state: NotionSyncState
): Promise<void> {
  await writeJsonFile(`${config.paths.stateDir}/notion-sync-state.json`, state);
}

function buildRecordProperties(
  record: NormalizedRecord,
  schema: NotionPropertySchema
): Record<string, unknown> {
  const titlePropertyName = getTitlePropertyName(schema);
  const properties: Record<string, unknown> = {
    [titlePropertyName]: {
      title: buildRichText(truncateText(buildRecordTitle(record), 200))
    }
  };

  setPropertyValue(properties, schema, "Project", record.projectSlug);
  setPropertyValue(properties, schema, "Task Slug", record.taskSlug);
  setPropertyValue(properties, schema, "Kind", record.kind);
  setPropertyValue(properties, schema, "Agent", record.agent);
  setPropertyValue(properties, schema, "Started At", record.startedAt);
  setPropertyValue(properties, schema, "Ended At", record.endedAt);
  setPropertyValue(properties, schema, "Status", record.status);
  setPropertyValue(properties, schema, "Capture Fidelity", record.captureFidelity);
  setPropertyValue(properties, schema, "Local Path", record.sourcePath);
  setPropertyValue(properties, schema, "Session ID", record.sessionId);
  setPropertyValue(properties, schema, "Config Needed", record.configNeeded.join("\n"));
  setPropertyValue(properties, schema, "Reusable Patterns", record.reusablePatterns.join("\n"));
  setPropertyValue(properties, schema, "Next Directions", record.nextDirections.join("\n"));
  setPropertyValue(properties, schema, "One Prompt Next Time", record.onePromptNextTime);
  setPropertyValue(properties, schema, "Is Latest Status", record.kind === "STATUS");

  return properties;
}

function buildRecordChildren(record: NormalizedRecord): Array<Record<string, unknown>> {
  const paragraphs = [
    `Summary: ${record.summary}`,
    `Status: ${record.status}`,
    record.onePromptNextTime ? `One Prompt Next Time: ${record.onePromptNextTime}` : "",
    record.userText ? `User Prompt: ${truncateText(record.userText, 1500)}` : "",
    record.assistantText ? `Assistant Response: ${truncateText(record.assistantText, 1500)}` : ""
  ].filter((value) => value.length > 0);

  return paragraphs.map((text) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: buildRichText(text)
    }
  }));
}

function buildRecordTitle(record: NormalizedRecord): string {
  return `[${record.kind}] ${record.projectSlug} / ${record.taskSlug}`;
}

function getTitlePropertyName(schema: NotionPropertySchema): string {
  const entry = Object.entries(schema).find(([, value]) => value.type === "title");
  return entry?.[0] ?? "Name";
}

function setPropertyValue(
  properties: Record<string, unknown>,
  schema: NotionPropertySchema,
  propertyName: string,
  value: string | boolean
): void {
  const propertyType = schema[propertyName]?.type;
  if (!propertyType) {
    return;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return;
  }

  switch (propertyType) {
    case "rich_text":
      properties[propertyName] = {
        rich_text: buildRichText(truncateText(String(value), 1900))
      };
      break;
    case "select":
      if (typeof value === "string") {
        properties[propertyName] = {
          select: {
            name: truncateText(value, 100)
          }
        };
      }
      break;
    case "date":
      if (typeof value === "string") {
        properties[propertyName] = {
          date: {
            start: value
          }
        };
      }
      break;
    case "checkbox":
      if (typeof value === "boolean") {
        properties[propertyName] = {
          checkbox: value
        };
      }
      break;
    default:
      break;
  }
}

function buildRichText(value: string): Array<Record<string, unknown>> {
  return [
    {
      type: "text",
      text: {
        content: value
      }
    }
  ];
}

function getCreatedPageId(value: unknown): string | null {
  if (!isRecord(value) || typeof value.id !== "string" || value.id.length === 0) {
    return null;
  }

  return value.id;
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
