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
});
