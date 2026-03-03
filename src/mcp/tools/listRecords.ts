import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { AiFlowMcpContext } from "../server.js";

export function registerListRecordsTool(
  server: McpServer,
  context: AiFlowMcpContext
): string {
  const name = "ai_flow_list_records";

  server.registerTool(
    name,
    {
      title: "List Records",
      description: "List prompt and plan records for a project.",
      inputSchema: {
        project_slug: z.string().min(1),
        response_format: z.enum(["markdown", "json"]).default("markdown"),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0)
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ project_slug, response_format, limit, offset }) => {
      const { total, items } = context.db.listRecords(project_slug, {}, limit, offset);
      const summaries = items.map((r) => ({
        record_id: r.recordId,
        task_slug: r.taskSlug,
        kind: r.kind,
        agent: r.agent,
        ended_at: r.endedAt,
        status: r.status,
        preview: r.summary.slice(0, 200)
      }));
      const output = { total, count: summaries.length, offset, items: summaries };

      return {
        content: [
          {
            type: "text",
            text:
              response_format === "json"
                ? JSON.stringify(output, null, 2)
                : `# Records (${total} total)\n\n${summaries
                    .map((s) => `- [${s.kind}] ${s.task_slug} (${s.agent}, ${s.ended_at})`)
                    .join("\n")}\n`
          }
        ],
        structuredContent: output
      };
    }
  );

  return name;
}
