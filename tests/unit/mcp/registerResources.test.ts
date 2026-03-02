import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { createAiFlowMcpServer } from "../../../src/mcp/server.js";

describe("mcp resource registration", () => {
  it("registers the required resource uris", async () => {
    const config = await loadAiFlowConfig();
    const bundle = await createAiFlowMcpServer(config);

    expect(bundle.resourceNames).toEqual([
      "ai-flow://projects",
      "ai-flow://project/{project_slug}/status",
      "ai-flow://project/{project_slug}/timeline",
      "ai-flow://project/{project_slug}/patterns",
      "ai-flow://project/{project_slug}/records/{record_id}"
    ]);
  });
});
