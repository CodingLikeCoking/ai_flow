import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { renderPromptMarkdown } from "../../core/renderers/promptRenderer.js";
import { renderPlanMarkdown } from "../../core/renderers/planRenderer.js";
import type { AiFlowMcpContext } from "../server.js";

export function registerSearchRecordsTool(
  server: McpServer,
  context: AiFlowMcpContext
): string {
  const name = "ai_flow_search_records";

  server.registerTool(
    name,
    {
      title: "Search Records",
      description: "Full-text search across all recorded prompts and plans.",
      inputSchema: {
        project_slug: z.string().min(1),
        query: z.string().min(1),
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
    async ({ project_slug, query, response_format, limit, offset }) => {
      const { total, items } = context.db.searchRecords(project_slug, query, limit, offset);
      const rendered = items.map((record) => ({
        record_id: record.recordId,
        task_slug: record.taskSlug,
        kind: record.kind,
        agent: record.agent,
        ended_at: record.endedAt,
        preview: record.summary.slice(0, 200)
      }));
      const output = { total, count: rendered.length, offset, items: rendered };

      const text =
        response_format === "json"
          ? JSON.stringify(output, null, 2)
          : items
              .map((r) => (r.kind === "PLAN" ? renderPlanMarkdown(r) : renderPromptMarkdown(r)))
              .join("\n---\n\n");

      return {
        content: [{ type: "text", text: text || "No results found." }],
        structuredContent: output
      };
    }
  );

  return name;
}
