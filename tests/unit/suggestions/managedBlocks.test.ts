import { describe, expect, it } from "vitest";

import { replaceManagedBlock } from "../../../src/core/suggestions/managedBlocks.js";

describe("managed block replacement", () => {
  it("replaces content inside the managed markers", () => {
    const updated = replaceManagedBlock(
      "before\nAI_FLOW_MANAGED_START\nold\nAI_FLOW_MANAGED_END\nafter\n",
      "new"
    );

    expect(updated).toContain("new");
  });
});
