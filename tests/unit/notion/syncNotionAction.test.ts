import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { syncNotionRecords } from "../../../src/core/actions/syncNotion.js";
import type { NormalizedRecord } from "../../../src/core/types.js";
import { writeTextFile } from "../../../src/core/fs/fileIO.js";

describe("sync notion action", () => {
  it("loads records from the dataset when no records are passed", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-sync-action-"));
    const config = await loadAiFlowConfig({ homeDir });
    const record = buildRecord();
    let syncedRecords: NormalizedRecord[] = [];

    await writeTextFile(
      join(config.paths.datasetDir, "conversations.ndjson"),
      `${JSON.stringify(record)}\n`
    );

    const result = await syncNotionRecords(config, [], {
      syncer: async (_config, records) => {
        syncedRecords = records;
        return {
          syncedCount: records.length,
          warnings: []
        };
      }
    });

    expect(result.syncedCount).toBe(1);
    expect(syncedRecords).toHaveLength(1);
    expect(syncedRecords[0]?.recordId).toBe(record.recordId);
  });
});

function buildRecord(): NormalizedRecord {
  return {
    recordId: "project-codex-session-1",
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
    reusablePatterns: [],
    onePromptNextTime: "Ship a reusable fix in one pass.",
    nextDirections: ["Verify the mirrored record in Notion."],
    notionPageId: null
  };
}
