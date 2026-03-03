import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { runScan } from "../../../src/core/actions/runScan.js";
import { AiFlowDatabase } from "../../../src/core/db/database.js";

describe("runScan database writes", () => {
  it("writes records to the database instead of the filesystem", async () => {
    await withNotionDisabled(async () => {
      const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-scan-"));
      const projectPath = join(sandbox, "Demo Project");
      const config = await loadAiFlowConfig({ homeDir: sandbox, desktopDir: sandbox });
      const db = new AiFlowDatabase(":memory:");

      try {
        const result = await runScan({
          config,
          db,
          events: [
            {
              agent: "codex",
              sessionId: "scan-1",
              projectPath,
              sourcePath: join(sandbox, "source.jsonl"),
              timestamp: "2026-03-02T10:00:00.000Z",
              role: "user",
              text: "Build a passive logger"
            },
            {
              agent: "codex",
              sessionId: "scan-1",
              projectPath,
              sourcePath: join(sandbox, "source.jsonl"),
              timestamp: "2026-03-02T10:00:01.000Z",
              role: "assistant",
              text: "Implemented the logger. Tests passed and the task is completed."
            }
          ]
        });

        expect(result.recordsCreated).toBe(1);

        const records = db.allRecords("demo-project");
        expect(records).toHaveLength(1);
        expect(records[0].taskSlug).toBe("build-a-passive-logger");
        expect(records[0].userText).toContain("Build a passive logger");
        expect(records[0].assistantText).toContain("Implemented the logger");
      } finally {
        db.close();
      }
    });
  }, 15_000);

  it("upserts plan records idempotently on repeated scans", async () => {
    await withNotionDisabled(async () => {
      const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-plan-"));
      const projectPath = join(sandbox, "Demo Project");
      const config = await loadAiFlowConfig({ homeDir: sandbox, desktopDir: sandbox });
      const db = new AiFlowDatabase(":memory:");

      try {
        const initialEvents = [
          {
            agent: "codex" as const,
            sessionId: "plan-1",
            projectPath,
            sourcePath: join(sandbox, "source.jsonl"),
            timestamp: "2026-03-03T10:00:00.000Z",
            role: "user" as const,
            text: "Plan the rollout"
          },
          {
            agent: "codex" as const,
            sessionId: "plan-1",
            projectPath,
            sourcePath: join(sandbox, "source.jsonl"),
            timestamp: "2026-03-03T10:00:01.000Z",
            role: "assistant" as const,
            text: "<proposed_plan>\nDraft plan"
          }
        ];

        await runScan({ config, db, events: initialEvents });
        await runScan({
          config,
          db,
          events: [
            ...initialEvents,
            {
              agent: "codex",
              sessionId: "plan-1",
              projectPath,
              sourcePath: join(sandbox, "source.jsonl"),
              timestamp: "2026-03-03T10:00:04.000Z",
              role: "assistant",
              text: "<proposed_plan>\nFinal plan"
            }
          ]
        });

        const records = db.allRecords("demo-project");
        expect(records).toHaveLength(1);
        expect(records[0].kind).toBe("PLAN");
        expect(records[0].assistantText).toContain("Final plan");
      } finally {
        db.close();
      }
    });
  }, 15_000);
});

async function withNotionDisabled(callback: () => Promise<void>): Promise<void> {
  const previousCwd = process.cwd();
  const previousEnv = {
    NOTION_TOKEN: process.env.NOTION_TOKEN,
    NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID
  };

  delete process.env.NOTION_TOKEN;
  delete process.env.NOTION_DATABASE_ID;
  process.chdir("/");

  try {
    await callback();
  } finally {
    process.chdir(previousCwd);
    process.env.NOTION_TOKEN = previousEnv.NOTION_TOKEN;
    process.env.NOTION_DATABASE_ID = previousEnv.NOTION_DATABASE_ID;
  }
}
