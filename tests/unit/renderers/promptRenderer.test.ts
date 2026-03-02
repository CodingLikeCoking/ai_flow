import { describe, expect, it } from "vitest";

import { renderPromptMarkdown } from "../../../src/core/renderers/promptRenderer.js";

describe("prompt renderer", () => {
  it("renders the required sections", () => {
    const markdown = renderPromptMarkdown({
      recordId: "r1",
      projectSlug: "demo",
      taskSlug: "demo-task",
      kind: "PROMPT",
      agent: "codex",
      captureFidelity: "full_fidelity",
      sessionId: "s1",
      sourcePath: "/tmp",
      startedAt: "2026-03-02T10:00:00.000Z",
      endedAt: "2026-03-02T10:01:00.000Z",
      status: "resolved",
      userText: "Do the task",
      assistantText: "Done",
      summary: "Summary",
      filesChanged: [],
      deliverables: [],
      configNeeded: [],
      buildVsBuy: [],
      reusablePatterns: [],
      onePromptNextTime: "Next prompt",
      nextDirections: ["Next step"],
      notionPageId: null
    });

    expect(markdown).toContain("## User Prompt");
    expect(markdown).toContain("## One Prompt Next Time");
  });
});
