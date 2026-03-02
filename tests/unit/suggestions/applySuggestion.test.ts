import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { applySuggestionToManagedBlock } from "../../../src/core/suggestions/applySuggestion.js";

describe("apply suggestion", () => {
  it("writes high-confidence suggestions into managed blocks only", async () => {
    const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-suggestion-"));
    const targetFile = join(sandbox, "AGENTS.md");
    writeFileSync(
      targetFile,
      "Intro\nAI_FLOW_MANAGED_START\nold\nAI_FLOW_MANAGED_END\nOutro\n",
      "utf8"
    );

    const applied = await applySuggestionToManagedBlock({
      id: "s1",
      category: "global_config",
      projectSlug: "demo",
      summary: "Prefer reuse",
      confidence: 0.95,
      targetFile,
      createdAt: "2026-03-02T10:00:00.000Z"
    });

    const contents = readFileSync(targetFile, "utf8");
    expect(applied).toBe(true);
    expect(contents).toContain("Prefer reuse");
  });
});
