import { describe, expect, it } from "vitest";

import { assessTaskBoundary } from "../../../src/core/analysis/taskBoundary.js";

describe("task boundary analysis", () => {
  it("marks a task resolved when at least two closure signals are present", () => {
    const decision = assessTaskBoundary("demo-task", [
      {
        agent: "claude",
        sessionId: "1",
        projectPath: "/tmp",
        sourcePath: "/tmp/a.jsonl",
        timestamp: "2026-03-02T10:00:00.000Z",
        role: "assistant",
        text: "Implemented the change. Tests passed and the task is completed."
      }
    ]);

    expect(decision.shouldCloseTask).toBe(true);
    expect(decision.status).toBe("resolved");
  });
});
