import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { createAiFlowMcpServer } from "../../../src/mcp/server.js";

describe("mcp tool registration", () => {
  it("registers the exact required tool names", async () => {
    const config = await loadAiFlowConfig();
    const bundle = await createAiFlowMcpServer(config);

    try {
      expect(bundle.toolNames).toEqual([
        "ai_flow_list_projects",
        "ai_flow_get_project_status",
        "ai_flow_list_records",
        "ai_flow_get_record",
        "ai_flow_search_records",
        "ai_flow_list_suggestions",
        "ai_flow_get_setup_guide",
        "ai_flow_run_scan",
        "ai_flow_sync_notion",
        "ai_flow_register_project",
        "ai_flow_similar_records",
        "ai_flow_apply_suggestion"
      ]);
    } finally {
      bundle.context.db.close();
    }
  });
});
