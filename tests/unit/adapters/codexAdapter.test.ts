import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { readCodexEvents } from "../../../src/core/adapters/codexAdapter.js";
import type { IngestionState } from "../../../src/core/state/stateStore.js";

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

  it("only returns appended codex events when ingestion state is provided", async () => {
    const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-codex-state-"));
    const rootDir = join(sandbox, "sessions");
    const sessionDir = join(rootDir, "2026");
    const file = join(sessionDir, "session.jsonl");
    const config = await loadAiFlowConfig({ homeDir: sandbox, desktopDir: sandbox });
    const state: IngestionState = {
      version: 2,
      files: {}
    };

    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      file,
      [
        JSON.stringify({
          type: "session_meta",
          timestamp: "2026-03-11T00:00:00.000Z",
          payload: { cwd: "/tmp/project", id: "codex-session-2" }
        }),
        JSON.stringify({
          type: "response_item",
          timestamp: "2026-03-11T00:00:01.000Z",
          payload: {
            type: "message",
            role: "user",
            content: [{ type: "output_text", text: "first prompt" }]
          }
        })
      ].join("\n") + "\n",
      "utf8"
    );

    const first = await readCodexEvents(config, { rootDir, state });
    expect(first).toHaveLength(1);
    expect(first[0].text).toBe("first prompt");

    writeFileSync(
      file,
      [
        JSON.stringify({
          type: "session_meta",
          timestamp: "2026-03-11T00:00:00.000Z",
          payload: { cwd: "/tmp/project", id: "codex-session-2" }
        }),
        JSON.stringify({
          type: "response_item",
          timestamp: "2026-03-11T00:00:01.000Z",
          payload: {
            type: "message",
            role: "user",
            content: [{ type: "output_text", text: "first prompt" }]
          }
        }),
        JSON.stringify({
          type: "response_item",
          timestamp: "2026-03-11T00:00:02.000Z",
          payload: {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "second response" }]
          }
        })
      ].join("\n") + "\n",
      "utf8"
    );

    const second = await readCodexEvents(config, { rootDir, state });
    expect(second).toHaveLength(1);
    expect(second[0].role).toBe("assistant");
    expect(second[0].text).toBe("second response");
  });
});
