import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { installClaudeHooks } from "../../../src/core/adapters/claudeHookInstaller.js";

describe("claude hook installer", () => {
  it("installs lifecycle hooks idempotently", async () => {
    const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-claude-hooks-"));
    const settingsPath = join(sandbox, "settings.json");

    await installClaudeHooks({ settingsPath, aiFlowBinaryPath: "/usr/local/bin/ai-flow" });
    await installClaudeHooks({ settingsPath, aiFlowBinaryPath: "/usr/local/bin/ai-flow" });

    const contents = JSON.parse(readFileSync(settingsPath, "utf8")) as Record<string, any>;
    expect(Object.keys(contents.hooks)).toEqual([
      "UserPromptSubmit",
      "Stop",
      "TaskCompleted",
      "SessionEnd"
    ]);
  });
});
