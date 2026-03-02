import { readFile } from "node:fs/promises";

import fg from "fast-glob";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { readProjectRegistryEntry } from "../../core/registry/projectRegistry.js";
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
      description: "Search markdown records for a substring.",
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
      const entry = await readProjectRegistryEntry(context.config, project_slug);
      const files = entry
        ? await fg("**/*.md", {
            cwd: `${entry.projectPath}/prompt`,
            absolute: true,
            suppressErrors: true
          })
        : [];
      const hits: Array<{ file: string; preview: string }> = [];

      for (const file of files) {
        const text = await readFile(file, "utf8");
        if (text.toLowerCase().includes(query.toLowerCase())) {
          hits.push({
            file,
            preview: text.split("\n").slice(0, 4).join("\n")
          });
        }
      }

      const sliced = hits.slice(offset, offset + limit);
      const output = { total: hits.length, count: sliced.length, offset, items: sliced };

      return {
        content: [
          {
            type: "text",
            text:
              response_format === "json"
                ? JSON.stringify(output, null, 2)
                : `# Search Results\n\n${sliced.map((item) => `- ${item.file}`).join("\n")}\n`
          }
        ],
        structuredContent: output
      };
    }
  );

  return name;
}
