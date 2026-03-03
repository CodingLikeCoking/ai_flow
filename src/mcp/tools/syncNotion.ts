import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { syncNotionRecords } from "../../core/actions/syncNotion.js";
import type { AiFlowMcpContext } from "../server.js";

export function registerSyncNotionTool(
  server: McpServer,
  context: AiFlowMcpContext
): string {
  const name = "ai_flow_sync_notion";

  server.registerTool(
    name,
    {
      title: "Sync Notion",
      description: "Attempt a Notion sync using current local data.",
      inputSchema: {
        confirm_write: z.boolean()
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ confirm_write }) => {
      if (!confirm_write) {
        throw new Error("confirm_write must be true");
      }

      const result = await syncNotionRecords(context.config, [], { db: context.db });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result
      };
    }
  );

  return name;
}
