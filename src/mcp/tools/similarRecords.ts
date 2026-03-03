import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { findSimilarRecords } from "../../core/db/embeddings.js";
import { renderPromptMarkdown } from "../../core/renderers/promptRenderer.js";
import { renderPlanMarkdown } from "../../core/renderers/planRenderer.js";
import type { AiFlowMcpContext } from "../server.js";

export function registerSimilarRecordsTool(
  server: McpServer,
  context: AiFlowMcpContext
): string {
  const name = "ai_flow_similar_records";

  server.registerTool(
    name,
    {
      title: "Similar Records",
      description:
        "Find records semantically similar to a query. Useful for discovering how past tasks were solved.",
      inputSchema: {
        query: z.string().min(1).describe("Natural language description of what you are looking for"),
        project_slug: z.string().optional().describe("Limit search to a specific project"),
        response_format: z.enum(["markdown", "json"]).default("markdown"),
        limit: z.number().int().min(1).max(50).default(10)
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ query, project_slug, response_format, limit }) => {
      const results = findSimilarRecords(context.db, query, project_slug, limit);

      const items = results.map(({ record, score }) => ({
        record_id: record.recordId,
        task_slug: record.taskSlug,
        kind: record.kind,
        agent: record.agent,
        score: Math.round(score * 1000) / 1000,
        preview: record.summary.slice(0, 200)
      }));

      const output = { query, total: items.length, items };

      if (response_format === "json") {
        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output
        };
      }

      const markdown = results
        .map(({ record, score }) => {
          const rendered =
            record.kind === "PLAN" ? renderPlanMarkdown(record) : renderPromptMarkdown(record);
          return `## Score: ${Math.round(score * 1000) / 1000}\n\n${rendered}`;
        })
        .join("\n---\n\n");

      return {
        content: [{ type: "text", text: markdown || "No similar records found." }],
        structuredContent: output
      };
    }
  );

  return name;
}
