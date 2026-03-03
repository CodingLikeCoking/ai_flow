import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { readCodexEvents } from "../../../src/core/adapters/codexAdapter.js";

describe("codex adapter", () => {
  it("parses codex session jsonl into adapter events", async () => {
    const config = await loadAiFlowConfig();
    const events = await readCodexEvents(config, {
      rootDir: "./tests/fixtures/codex"
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      agent: "codex",
      role: "user",
      sessionId: "codex-session-1"
    });
    expect(events[1].text).toContain("done");
  }, 10_000);
});
