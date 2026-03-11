import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runScan } from "../../../src/core/actions/runScan.js";
import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { AiFlowDatabase } from "../../../src/core/db/database.js";

describe("runScan", () => {
  it("skips sessions when launchd-style execution has no resolvable project path", async () => {
    const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-runscan-"));
    const config = await loadAiFlowConfig({ homeDir: sandbox, desktopDir: sandbox });
    const db = new AiFlowDatabase(":memory:");
    const previousCwd = process.cwd();

    process.chdir("/");

    try {
      const result = await runScan({
        config,
        db,
        events: [
          {
            agent: "claude",
            sessionId: "hook-1",
            sourcePath: join(sandbox, "hook.json"),
            timestamp: "2026-03-02T10:00:00.000Z",
            role: "user",
            text: "Check background mode"
          }
        ]
      });

      expect(result.recordsCreated).toBe(0);
      expect(result.warnings).toContain(
        "Skipped claude:hook-1 because no project path could be determined."
      );
    } finally {
      process.chdir(previousCwd);
      db.close();
    }
  });

  it("tracks updated records and persists Notion page ids returned by sync", async () => {
    const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-runscan-notion-"));
    const projectPath = join(sandbox, "Demo Project");
    const config = await loadAiFlowConfig({ homeDir: sandbox, desktopDir: sandbox });
    const db = new AiFlowDatabase(":memory:");
    const events = [
      {
        agent: "codex" as const,
        sessionId: "scan-1",
        projectPath,
        sourcePath: join(sandbox, "source.jsonl"),
        timestamp: "2026-03-02T10:00:00.000Z",
        role: "user" as const,
        text: "Build a passive logger"
      },
      {
        agent: "codex" as const,
        sessionId: "scan-1",
        projectPath,
        sourcePath: join(sandbox, "source.jsonl"),
        timestamp: "2026-03-02T10:00:01.000Z",
        role: "assistant" as const,
        text: "Implemented the logger."
      }
    ];

    try {
      const first = await runScan({
        config,
        db,
        events,
        syncNotion: async () => ({
          syncedCount: 1,
          warnings: [],
          recordPageIds: {
            "demo-project-codex-scan-1": "page-123"
          }
        })
      });

      const second = await runScan({
        config,
        db,
        events: [
          ...events,
          {
            agent: "codex",
            sessionId: "scan-1",
            projectPath,
            sourcePath: join(sandbox, "source.jsonl"),
            timestamp: "2026-03-02T10:00:02.000Z",
            role: "assistant",
            text: "Implemented the logger. Tests passed and the task is completed."
          }
        ],
        syncNotion: async () => ({
          syncedCount: 1,
          warnings: [],
          recordPageIds: {
            "demo-project-codex-scan-1": "page-123"
          }
        })
      });

      expect(first.recordsCreated).toBe(1);
      expect(first.recordsUpdated).toBe(0);
      expect(second.recordsCreated).toBe(0);
      expect(second.recordsUpdated).toBe(1);
      expect(db.getRecord("demo-project-codex-scan-1")?.notionPageId).toBe("page-123");
    } finally {
      db.close();
    }
  });
});
