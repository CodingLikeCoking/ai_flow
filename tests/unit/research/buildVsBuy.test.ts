import { describe, expect, it } from "vitest";

import { runBuildVsBuyResearch } from "../../../src/core/research/buildVsBuy.js";

describe("build-vs-buy research", () => {
  it("returns default provider options for new build prompts", () => {
    const options = runBuildVsBuyResearch("Please build a new tool for this workflow");
    expect(options).toHaveLength(5);
  });
});
