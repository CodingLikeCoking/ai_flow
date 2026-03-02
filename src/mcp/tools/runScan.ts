import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { runScan } from "../../core/actions/runScan.js";
import type { AiFlowMcpContext } from "../server.js";

export function registerRunScanTool(
  server: McpServer,
  context: AiFlowMcpContext
): string {
  const name = "ai_flow_run_scan";

  server.registerTool(
    name,
    {
      title: "Run Scan",
      description: "Run the passive collector immediately.",
      inputSchema: {
        confirm_write: z.boolean()
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ confirm_write }) => {
      if (!confirm_write) {
        throw new Error("confirm_write must be true");
      }

      const result = await runScan({ config: context.config });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: { ...result }
      };
    }
  );

  return name;
}
