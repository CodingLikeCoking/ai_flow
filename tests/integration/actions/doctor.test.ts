import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { runDoctor } from "../../../src/core/actions/doctor.js";

describe("doctor action", () => {
  it("surfaces setup guidance when Notion is not configured", async () => {
    const config = await loadAiFlowConfig();
    const result = runDoctor(config);

    expect(result.messages.some((message) => message.includes("Notion"))).toBe(true);
  });
});
