import { describe, expect, it } from "vitest";

import {
  getGlobalProjectPaths,
  getProjectPaths,
  slugifyProjectName
} from "../../../src/core/fs/paths.js";

describe("path helpers", () => {
  it("builds canonical project paths", () => {
    const paths = getProjectPaths("/tmp/My Project", "my-project");

    expect(paths.promptDir).toBe("/tmp/My Project/prompt");
    expect(paths.projectStatusFile).toBe("/tmp/My Project/prompt/_project/project-status.md");
    expect(paths.timelineFile).toBe("/tmp/My Project/prompt/_project/timeline.md");
    expect(paths.taskPromptFile("demo-task", 1)).toBe(
      "/tmp/My Project/prompt/demo-task/prompt-001.md"
    );
    expect(paths.taskPlanFile("demo-task", 2)).toBe(
      "/tmp/My Project/prompt/demo-task/plan-002.md"
    );
    expect(paths.taskPlanDocumentFile("demo-task")).toBe(
      "/tmp/My Project/prompt/demo-task/plan.md"
    );
  });

  it("builds canonical Desktop global mirror paths", () => {
    const paths = getGlobalProjectPaths("my-project");

    expect(paths.projectDir.endsWith("/Desktop/prompt_global/my-project")).toBe(true);
    expect(paths.projectStatusFile.endsWith("/Desktop/prompt_global/my-project/project-status.md")).toBe(
      true
    );
  });

  it("slugifies project names", () => {
    expect(slugifyProjectName("Programming Best Practice")).toBe("programming-best-practice");
  });
});
