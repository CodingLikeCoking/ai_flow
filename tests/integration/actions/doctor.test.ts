import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { runDoctor } from "../../../src/core/actions/doctor.js";

describe("doctor action", () => {
  it("surfaces setup guidance when Notion is not configured", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-doctor-"));
    const previousCwd = process.cwd();
    const previousEnv = {
      NOTION_TOKEN: process.env.NOTION_TOKEN,
      NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID
    };

    delete process.env.NOTION_TOKEN;
    delete process.env.NOTION_DATABASE_ID;
    process.chdir("/");

    try {
      const config = await loadAiFlowConfig({ homeDir });
      const result = runDoctor(config);

      expect(result.messages.some((message) => message.includes("Notion"))).toBe(true);
    } finally {
      process.chdir(previousCwd);
      process.env.NOTION_TOKEN = previousEnv.NOTION_TOKEN;
      process.env.NOTION_DATABASE_ID = previousEnv.NOTION_DATABASE_ID;
    }
  });
});
