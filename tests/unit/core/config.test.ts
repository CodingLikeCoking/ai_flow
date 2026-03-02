import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";

describe("config loader", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      // Best-effort cleanup is unnecessary in tests; temp dirs can remain.
      void root;
    }
  });

  it("bootstraps defaults when config file is missing", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-config-"));
    tempRoots.push(homeDir);

    const config = await loadAiFlowConfig({ homeDir });

    expect(config.scanIntervalSeconds).toBe(60);
    expect(config.mcp.http.host).toBe("127.0.0.1");
    expect(config.paths.aiFlowHome.startsWith(homeDir)).toBe(true);
  });

  it("rejects invalid config with an actionable message", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-invalid-"));
    tempRoots.push(homeDir);

    await expect(
      loadAiFlowConfig({
        homeDir,
        rawConfig: {
          scanIntervalSeconds: 0
        }
      })
    ).rejects.toThrow("scanIntervalSeconds");
  });
});
