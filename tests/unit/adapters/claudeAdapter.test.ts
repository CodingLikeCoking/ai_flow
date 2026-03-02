import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { readClaudeTranscriptEvents } from "../../../src/core/adapters/claudeTranscriptAdapter.js";

describe("claude transcript adapter", () => {
  it("parses claude transcript jsonl into adapter events", async () => {
    const config = await loadAiFlowConfig();
    const events = await readClaudeTranscriptEvents(config, {
      rootDir: "./tests/fixtures/claude"
    });

    expect(events).toHaveLength(2);
    expect(events[0].role).toBe("user");
    expect(events[1].role).toBe("assistant");
  });
});
