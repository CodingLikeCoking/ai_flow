import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { syncRecordsToNotion } from "../../../src/core/notion/syncService.js";
import type { NormalizedRecord } from "../../../src/core/types.js";

describe("notion sync service", () => {
  const previousEnv = {
    NOTION_TOKEN: process.env.NOTION_TOKEN,
    NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID
  };

  afterEach(() => {
    process.env.NOTION_TOKEN = previousEnv.NOTION_TOKEN;
    process.env.NOTION_DATABASE_ID = previousEnv.NOTION_DATABASE_ID;
  });

  it("returns a setup guide when credentials are missing", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-notion-missing-"));
    const previousCwd = process.cwd();

    delete process.env.NOTION_TOKEN;
    delete process.env.NOTION_DATABASE_ID;
    process.chdir("/");

    try {
      const config = await loadAiFlowConfig({ homeDir });
      const result = await syncRecordsToNotion(config, []);

      expect(result.syncedCount).toBe(0);
      expect(result.setupGuide?.title).toContain("Connect Notion");
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("creates a page on first sync and updates it on repeat syncs", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-notion-sync-"));
    const config = await loadAiFlowConfig({ homeDir });
    const record = buildRecord();
    const createdPayloads: unknown[] = [];
    const updatedPayloads: unknown[] = [];

    process.env.NOTION_TOKEN = "test-token";
    process.env.NOTION_DATABASE_ID = "test-database";

    const fakeClient = {
      databases: {
        retrieve: async () => ({
          properties: {
            Name: { type: "title" },
            Project: { type: "rich_text" },
            "One Prompt Next Time": { type: "rich_text" }
          }
        })
      },
      pages: {
        create: async (payload: unknown) => {
          createdPayloads.push(payload);
          return { id: "page-123" };
        },
        update: async (payload: unknown) => {
          updatedPayloads.push(payload);
          return { id: "page-123" };
        }
      }
    };

    const first = await syncRecordsToNotion(config, [record], {
      client: fakeClient
    });
    const second = await syncRecordsToNotion(config, [record], {
      client: fakeClient
    });

    expect(first.syncedCount).toBe(1);
    expect(second.syncedCount).toBe(1);
    expect(first.recordPageIds).toEqual({
      "project-codex-session-1": "page-123"
    });
    expect(second.recordPageIds).toEqual({
      "project-codex-session-1": "page-123"
    });
    expect(createdPayloads).toHaveLength(1);
    expect(updatedPayloads).toHaveLength(1);
    expect(JSON.stringify(createdPayloads[0])).toContain("test-database");
    expect(JSON.stringify(createdPayloads[0])).toContain("Ship a reusable fix in one pass.");
    expect(JSON.stringify(updatedPayloads[0])).toContain("page-123");

    const savedState = readFileSync(join(config.paths.stateDir, "notion-sync-state.json"), "utf8");
    expect(savedState).toContain("\"project-codex-session-1\": \"page-123\"");
  });

  it("processes Notion sync in configured batches", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-notion-batch-"));
    const config = await loadAiFlowConfig({
      homeDir,
      rawConfig: {
        performance: {
          notionBatchSize: 2
        }
      }
    });
    const createCalls: string[] = [];

    process.env.NOTION_TOKEN = "test-token";
    process.env.NOTION_DATABASE_ID = "test-database";

    const fakeClient = {
      databases: {
        retrieve: async () => ({
          properties: {
            Name: { type: "title" }
          }
        })
      },
      pages: {
        create: async () => {
          createCalls.push("create");
          return { id: `page-${createCalls.length}` };
        },
        update: async () => ({ id: "page-existing" })
      }
    };

    const records = [
      buildRecord("batch-1"),
      buildRecord("batch-2"),
      buildRecord("batch-3")
    ];
    const result = await syncRecordsToNotion(config, records, {
      client: fakeClient
    });

    expect(result.syncedCount).toBe(3);
    expect(createCalls).toHaveLength(3);
    expect(result.recordPageIds).toEqual({
      "batch-1": "page-1",
      "batch-2": "page-2",
      "batch-3": "page-3"
    });
  });
});

function buildRecord(recordId = "project-codex-session-1"): NormalizedRecord {
  return {
    recordId,
    projectSlug: "project",
    taskSlug: "sync-notion",
    kind: "PROMPT",
    agent: "codex",
    captureFidelity: "full_fidelity",
    sessionId: "session-1",
    sourcePath: "/tmp/session.jsonl",
    startedAt: "2026-03-03T09:00:00.000Z",
    endedAt: "2026-03-03T09:10:00.000Z",
    status: "resolved",
    userText: "Please connect Notion sync.",
    assistantText: "Notion sync is now implemented.",
    summary: "Notion sync works.",
    filesChanged: [],
    deliverables: ["prompt-log"],
    configNeeded: ["Configure Notion integration"],
    buildVsBuy: [],
    reusablePatterns: ["Mirror local records to Notion"],
    onePromptNextTime: "Ship a reusable fix in one pass.",
    nextDirections: ["Verify the mirrored record in Notion."],
    notionPageId: null
  };
}
