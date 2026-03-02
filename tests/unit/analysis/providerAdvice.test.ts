import { describe, expect, it } from "vitest";

import { getProviderAdviceRules } from "../../../src/core/analysis/providerAdvice.js";

describe("provider advice rules", () => {
  it("includes both openai and anthropic rules", () => {
    const rules = getProviderAdviceRules();
    expect(rules.some((rule) => rule.provider === "openai")).toBe(true);
    expect(rules.some((rule) => rule.provider === "anthropic")).toBe(true);
  });
});
