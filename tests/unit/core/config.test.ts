import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
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
    expect(config.ux.targetAudience).toBe("non_technical");
    expect(config.workflow.searchBeforeBuild).toBe(true);
    expect(config.performance.streamingIngestion).toBe(true);
    expect(config.performance.maxBytesPerScanPass).toBe(8_388_608);
    expect(config.release.autoPush).toBe(true);
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

  it("loads runtime environment values from ~/.ai-flow/.env when process env is empty", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-env-"));
    const aiFlowDir = join(homeDir, ".ai-flow");
    const envPath = join(aiFlowDir, ".env");
    const previousCwd = process.cwd();
    tempRoots.push(homeDir);

    mkdirSync(aiFlowDir, { recursive: true });
    writeFileSync(
      envPath,
      "NOTION_TOKEN=test-token\nNOTION_DATABASE_ID=test-db\nAI_FLOW_MCP_TOKEN=test-mcp-token\n",
      "utf8"
    );

    const previous = {
      NOTION_TOKEN: process.env.NOTION_TOKEN,
      NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID,
      AI_FLOW_MCP_TOKEN: process.env.AI_FLOW_MCP_TOKEN
    };

    delete process.env.NOTION_TOKEN;
    delete process.env.NOTION_DATABASE_ID;
    delete process.env.AI_FLOW_MCP_TOKEN;
    process.chdir("/");

    try {
      await loadAiFlowConfig({ homeDir });

      expect(process.env.NOTION_TOKEN).toBe("test-token");
      expect(process.env.NOTION_DATABASE_ID).toBe("test-db");
      expect(process.env.AI_FLOW_MCP_TOKEN).toBe("test-mcp-token");
    } finally {
      process.chdir(previousCwd);
      process.env.NOTION_TOKEN = previous.NOTION_TOKEN;
      process.env.NOTION_DATABASE_ID = previous.NOTION_DATABASE_ID;
      process.env.AI_FLOW_MCP_TOKEN = previous.AI_FLOW_MCP_TOKEN;
    }
  });

  it("merges nested workflow and release config overrides", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-config-merge-"));
    tempRoots.push(homeDir);

    const config = await loadAiFlowConfig({
      homeDir,
      rawConfig: {
        workflow: {
          providerRules: {
            openai: ["Be concise"],
            anthropic: ["Use CLAUDE.md"],
            deepseek: ["Prefer explicit output schemas"]
          }
        },
        release: {
          autoPush: false,
          commitMessageTemplate: "chore: sync ai-flow defaults"
        }
      }
    });

    expect(config.workflow.providerRules.openai).toEqual(["Be concise"]);
    expect(config.workflow.providerRules.deepseek).toEqual([
      "Prefer explicit output schemas"
    ]);
    expect(config.release.enabled).toBe(true);
    expect(config.release.autoPush).toBe(false);
    expect(config.release.commitMessageTemplate).toBe(
      "chore: sync ai-flow defaults"
    );
  });
});
