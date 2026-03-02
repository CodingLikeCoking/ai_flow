import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { readCursorEvents } from "../../../src/core/adapters/cursorAdapter.js";

describe("cursor adapter", () => {
  it("reads cursor summary rows from sqlite", async () => {
    const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-cursor-"));
    const dbPath = join(sandbox, "ai-code-tracking.db");
    const db = new Database(dbPath);

    db.exec(`
      CREATE TABLE conversation_summaries (
        conversationId TEXT PRIMARY KEY,
        title TEXT,
        tldr TEXT,
        overview TEXT,
        model TEXT,
        mode TEXT,
        updatedAt INTEGER NOT NULL
      );
      INSERT INTO conversation_summaries (
        conversationId, title, tldr, overview, model, mode, updatedAt
      ) VALUES (
        'cursor-session-1', 'Tracked change', 'Quick summary', 'Detailed summary', 'gpt', 'agent', 1700000000000
      );
    `);
    db.close();

    const config = await loadAiFlowConfig();
    const events = await readCursorEvents(config, { dbPath });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      agent: "cursor",
      role: "assistant",
      sessionId: "cursor-session-1"
    });
    expect(events[0].metadata?.summaryOnly).toBe(true);
  });
});
