import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { runScan } from "../../../src/core/actions/runScan.js";

describe("runScan filesystem writes", () => {
  it("writes local prompt files, desktop mirror files, and dataset exports", async () => {
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
});
