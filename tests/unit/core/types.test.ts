import { describe, expect, it } from "vitest";

import {
  AGENT_NAMES,
  RECORD_KINDS,
  SUGGESTION_CATEGORIES
} from "../../../src/core/types.js";

describe("core types constants", () => {
  it("exports the supported agent names", () => {
    expect(AGENT_NAMES).toEqual(["codex", "claude", "cursor"]);
  });

  it("exports the supported record kinds", () => {
    expect(RECORD_KINDS).toEqual([
      "PROMPT",
      "PLAN",
      "STATUS",
      "SUGGESTION",
      "SETUP_GUIDE"
    ]);
  });

  it("exports the supported suggestion categories", () => {
    expect(SUGGESTION_CATEGORIES).toContain("provider_best_practice");
  });
});
