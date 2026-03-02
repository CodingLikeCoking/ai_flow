import { describe, expect, it } from "vitest";

import { renderStatusMarkdown } from "../../../src/core/renderers/statusRenderer.js";

describe("status renderer", () => {
  it("renders open tasks and next directions", () => {
    const markdown = renderStatusMarkdown({
      projectSlug: "demo",
      projectName: "Demo",
      purpose: "Track work",
      phase: "In progress",
      completedTasks: [],
      openTasks: ["demo-task"],
      timelineHighlights: [],
      deliverables: [],
      blockers: [],
      nextDirections: ["Review the output"],
      updatedAt: "2026-03-02T10:00:00.000Z"
    });

    expect(markdown).toContain("## Open Tasks");
    expect(markdown).toContain("demo-task");
  });
});
