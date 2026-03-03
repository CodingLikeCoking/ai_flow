import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { renderPromptMarkdown } from "../../core/renderers/promptRenderer.js";
import { renderPlanMarkdown } from "../../core/renderers/planRenderer.js";
import type { AiFlowMcpContext } from "../server.js";

export function registerGetRecordTool(
  server: McpServer,
  context: AiFlowMcpContext
): string {
  const name = "ai_flow_get_record";

  server.registerTool(
    name,
    {
      title: "Get Record",
      description: "Get a single record by its ID, rendered as markdown or JSON.",
      inputSchema: {
        record_id: z.string().min(1),
        response_format: z.enum(["markdown", "json"]).default("markdown")
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ record_id, response_format }) => {
      const record = context.db.getRecord(record_id);

      if (!record) {
        return {
          content: [{ type: "text", text: `Record not found: ${record_id}` }],
          isError: true
        };
      }

      const markdown =
        record.kind === "PLAN" ? renderPlanMarkdown(record) : renderPromptMarkdown(record);

      return {
        content: [
          {
            type: "text",
            text: response_format === "json" ? JSON.stringify(record, null, 2) : markdown
          }
        ],
        structuredContent: { ...record }
      };
    }
  );

  return name;
}
