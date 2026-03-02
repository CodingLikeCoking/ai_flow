import { describe, expect, it } from "vitest";

import { renderPlanMarkdown } from "../../../src/core/renderers/planRenderer.js";

describe("plan renderer", () => {
  it("renders planning q-and-a and the final plan in one document", () => {
    const markdown = renderPlanMarkdown({
      recordId: "r1",
      projectSlug: "demo",
      taskSlug: "demo-plan",
      kind: "PLAN",
      agent: "codex",
      captureFidelity: "full_fidelity",
      sessionId: "s1",
      sourcePath: "/tmp",
      startedAt: "2026-03-03T09:00:00.000Z",
      endedAt: "2026-03-03T09:01:00.000Z",
      status: "resolved",
      userText: "First answer\n\nSecond answer",
      assistantText: "<proposed_plan>\nFinal plan body",
      summary: "Plan summary",
      filesChanged: [],
      deliverables: ["plan"],
      configNeeded: [],
      buildVsBuy: [],
      reusablePatterns: [],
      onePromptNextTime: "",
      nextDirections: ["Ship it"],
      notionPageId: null
    });

    expect(markdown).toContain("## Planning Q&A");
    expect(markdown).toContain("First answer");
    expect(markdown).toContain("## Final Plan");
    expect(markdown).toContain("Final plan body");
  });
});
