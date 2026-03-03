import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { runScan } from "../../../src/core/actions/runScan.js";
import { initProject } from "../../../src/core/actions/initProject.js";
import { writeTextFile } from "../../../src/core/fs/fileIO.js";

describe("runScan filesystem writes", () => {
  it("writes local prompt files, desktop mirror files, and dataset exports", async () => {
    await withNotionDisabled(async () => {
      const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-scan-"));
      const projectPath = join(sandbox, "Demo Project");
      const config = await loadAiFlowConfig({ homeDir: sandbox, desktopDir: sandbox });

      const result = await runScan({
        config,
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

      const promptPath = join(
        projectPath,
        "prompt",
        "build-a-passive-logger",
        "prompt-001.md"
      );
      const mirrorPath = join(
        sandbox,
        "prompt_global",
        "demo-project",
        "records",
        "build-a-passive-logger-prompt-001.md"
      );
      const datasetPath = join(sandbox, ".ai-flow", "dataset", "conversations.ndjson");

      expect(result.recordsCreated).toBe(1);
      expect(readFileSync(promptPath, "utf8")).toContain("[AGENT]");
      expect(readFileSync(mirrorPath, "utf8")).toContain("[AGENT]");
      expect(readFileSync(datasetPath, "utf8")).toContain("\"taskSlug\":\"build-a-passive-logger\"");
    });
  }, 15_000);

  it("keeps a single plan markdown file per task and overwrites it on later scans", async () => {
    await withNotionDisabled(async () => {
      const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-plan-"));
      const projectPath = join(sandbox, "Demo Project");
      const config = await loadAiFlowConfig({ homeDir: sandbox, desktopDir: sandbox });

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
          text: "What should be included?"
        },
        {
          agent: "codex" as const,
          sessionId: "plan-1",
          projectPath,
          sourcePath: join(sandbox, "source.jsonl"),
          timestamp: "2026-03-03T10:00:02.000Z",
          role: "user" as const,
          text: "Include launch, docs, and rollback."
        },
        {
          agent: "codex" as const,
          sessionId: "plan-1",
          projectPath,
          sourcePath: join(sandbox, "source.jsonl"),
          timestamp: "2026-03-03T10:00:03.000Z",
          role: "assistant" as const,
          text: "<proposed_plan>\nDraft plan"
        }
      ];

      await runScan({ config, events: initialEvents });
      await runScan({
        config,
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

      const taskDir = join(projectPath, "prompt", "plan-the-rollout");
      const planFiles = readdirSync(taskDir).filter((name) => name.startsWith("plan"));
      const planPath = join(taskDir, "plan.md");

      expect(planFiles).toEqual(["plan.md"]);
      expect(readFileSync(planPath, "utf8")).toContain("Include launch, docs, and rollback.");
      expect(readFileSync(planPath, "utf8")).toContain("Final plan");
    });
  }, 15_000);

  it("migrates legacy numbered plan files into a single stable plan.md and removes duplicates", async () => {
    await withNotionDisabled(async () => {
      const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-legacy-plan-"));
      const projectPath = join(sandbox, "Demo Project");
      const config = await loadAiFlowConfig({ homeDir: sandbox, desktopDir: sandbox });

      await initProject({
        config,
        projectPath,
        projectName: "Demo Project"
      });

      const taskDir = join(projectPath, "prompt", "legacy-plan-task");
      await writeTextFile(join(taskDir, "plan-001.md"), "# [PLAN] Plan\n\nOld plan\n");
      await writeTextFile(join(taskDir, "plan-002.md"), "# [PLAN] Plan\n\nLatest legacy plan\n");

      const result = await runScan({ config, events: [] });
      const planFiles = readdirSync(taskDir).filter((name) => name.startsWith("plan"));

      expect(result.recordsCreated).toBe(0);
      expect(planFiles).toEqual(["plan.md"]);
      expect(readFileSync(join(taskDir, "plan.md"), "utf8")).toContain("Latest legacy plan");
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
