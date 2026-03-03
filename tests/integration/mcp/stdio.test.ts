import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { createAiFlowMcpServer } from "../../../src/mcp/server.js";

describe("mcp stdio integration smoke", () => {
  it("builds an MCP server bundle for stdio use", async () => {
    const config = await loadAiFlowConfig();
    const bundle = await createAiFlowMcpServer(config);

    try {
      expect(bundle.server).toBeDefined();
      expect(bundle.toolNames).toContain("ai_flow_list_projects");
    } finally {
      bundle.context.db.close();
    }
  });
});
