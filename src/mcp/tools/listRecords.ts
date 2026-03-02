import { readFile } from "node:fs/promises";

import fg from "fast-glob";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { readProjectRegistryEntry } from "../../core/registry/projectRegistry.js";
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
      description: "List prompt and plan markdown files for a project.",
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
      const entry = await readProjectRegistryEntry(context.config, project_slug);
      const files = entry
        ? await fg("**/*.md", {
            cwd: `${entry.projectPath}/prompt`,
            absolute: true,
            suppressErrors: true
          })
        : [];
      const sliced = files.slice(offset, offset + limit);
      const items = await Promise.all(
        sliced.map(async (file) => ({
          file,
          preview: (await readFile(file, "utf8")).split("\n").slice(0, 3).join("\n")
        }))
      );
      const output = { total: files.length, count: items.length, offset, items };

      return {
        content: [
          {
            type: "text",
            text:
              response_format === "json"
                ? JSON.stringify(output, null, 2)
                : `# Records\n\n${items.map((item) => `- ${item.file}`).join("\n")}\n`
          }
        ],
        structuredContent: output
      };
    }
  );

  return name;
}
