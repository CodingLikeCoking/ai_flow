import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { readClaudeTranscriptEvents } from "../../../src/core/adapters/claudeTranscriptAdapter.js";
import type { IngestionState } from "../../../src/core/state/stateStore.js";

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

  it("only returns appended claude transcript events when ingestion state is provided", async () => {
    const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-claude-state-"));
    const rootDir = join(sandbox, "transcripts");
    const file = join(rootDir, "session.jsonl");
    const config = await loadAiFlowConfig({ homeDir: sandbox, desktopDir: sandbox });
    const state: IngestionState = {
      version: 2,
      files: {}
    };

    mkdirSync(rootDir, { recursive: true });
    writeFileSync(
      file,
      [
        JSON.stringify({
          type: "user",
          timestamp: "2026-03-11T00:00:00.000Z",
          sessionId: "claude-session-2",
          project: "/tmp/project",
          content: "first prompt"
        })
      ].join("\n") + "\n",
      "utf8"
    );

    const first = await readClaudeTranscriptEvents(config, { rootDir, state });
    expect(first).toHaveLength(1);
    expect(first[0].text).toBe("first prompt");

    writeFileSync(
      file,
      [
        JSON.stringify({
          type: "user",
          timestamp: "2026-03-11T00:00:00.000Z",
          sessionId: "claude-session-2",
          project: "/tmp/project",
          content: "first prompt"
        }),
        JSON.stringify({
          type: "assistant",
          timestamp: "2026-03-11T00:00:01.000Z",
          sessionId: "claude-session-2",
          project: "/tmp/project",
          content: "second response"
        })
      ].join("\n") + "\n",
      "utf8"
    );

    const second = await readClaudeTranscriptEvents(config, { rootDir, state });
    expect(second).toHaveLength(1);
    expect(second[0].role).toBe("assistant");
    expect(second[0].text).toBe("second response");
  });

  it("respects the configured byte budget and resumes later for claude transcripts", async () => {
    const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-claude-budget-"));
    const rootDir = join(sandbox, "transcripts");
    const file = join(rootDir, "session.jsonl");
    const config = await loadAiFlowConfig({ homeDir: sandbox, desktopDir: sandbox });
    const state: IngestionState = {
      version: 2,
      files: {}
    };
    const firstLine = `${JSON.stringify({
      type: "user",
      timestamp: "2026-03-11T00:00:00.000Z",
      sessionId: "claude-session-3",
      project: "/tmp/project",
      content: "first prompt"
    })}\n`;
    const secondLine = `${JSON.stringify({
      type: "assistant",
      timestamp: "2026-03-11T00:00:01.000Z",
      sessionId: "claude-session-3",
      project: "/tmp/project",
      content: "second response"
    })}\n`;

    mkdirSync(rootDir, { recursive: true });
    writeFileSync(file, `${firstLine}${secondLine}`, "utf8");

    const first = await readClaudeTranscriptEvents(config, {
      rootDir,
      state,
      maxBytesPerScanPass: Buffer.byteLength(firstLine)
    });
    expect(first).toHaveLength(1);
    expect(first[0].text).toBe("first prompt");

    const second = await readClaudeTranscriptEvents(config, {
      rootDir,
      state,
      maxBytesPerScanPass: Buffer.byteLength(secondLine)
    });
    expect(second).toHaveLength(1);
    expect(second[0].text).toBe("second response");
  });
});
