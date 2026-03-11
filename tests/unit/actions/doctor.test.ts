import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runDoctor } from "../../../src/core/actions/doctor.js";
import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";

describe("doctor action", () => {
  it("returns actionable beginner-friendly setup checks", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-doctor-actionable-"));
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

      expect(result.ok).toBe(false);
      expect(result.messages.some((message) => message.includes("What is working"))).toBe(
        true
      );
      expect(
        result.messages.some((message) => message.includes("Set NOTION_TOKEN"))
      ).toBe(true);
      expect(
        result.messages.some((message) => message.includes("Target audience"))
      ).toBe(true);
    } finally {
      process.chdir(previousCwd);
      process.env.NOTION_TOKEN = previousEnv.NOTION_TOKEN;
      process.env.NOTION_DATABASE_ID = previousEnv.NOTION_DATABASE_ID;
    }
  });
});
