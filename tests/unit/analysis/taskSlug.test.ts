import { describe, expect, it } from "vitest";

import { deriveTaskSlug } from "../../../src/core/analysis/taskSlug.js";

describe("task slug analysis", () => {
  it("derives a kebab-case task slug from the first user message", () => {
    const slug = deriveTaskSlug(
      [
        {
          agent: "codex",
          sessionId: "1",
          projectPath: "/tmp",
          sourcePath: "/tmp/a.jsonl",
          timestamp: "2026-03-02T10:00:00.000Z",
          role: "user",
          text: "Please build a prompt archive tool"
        }
      ],
      "fallback"
    );

    expect(slug).toBe("build-a-prompt-archive-tool");
  });
});
