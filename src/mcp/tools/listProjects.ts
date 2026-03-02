import { readFile } from "node:fs/promises";

import fg from "fast-glob";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { AiFlowMcpContext } from "../server.js";

export function registerListProjectsTool(
  server: McpServer,
  context: AiFlowMcpContext
): string {
  const name = "ai_flow_list_projects";

  server.registerTool(
    name,
    {
      title: "List Projects",
      description: "List registered ai-flow projects.",
      inputSchema: {
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
    async ({ response_format, limit, offset }) => {
      const files = await fg("*.json", {
        cwd: context.config.paths.projectsDir,
        absolute: true,
        suppressErrors: true
      });
      const entries = await Promise.all(
        files.slice(offset, offset + limit).map(async (file) =>
          JSON.parse(await readFile(file, "utf8"))
        )
      );
      const output = { total: files.length, count: entries.length, offset, items: entries };

      return {
        content: [
          {
            type: "text",
            text:
              response_format === "json"
                ? JSON.stringify(output, null, 2)
                : `# Projects\n\n${entries
                    .map((entry: any) => `- ${entry.projectSlug} (${entry.projectPath})`)
                    .join("\n")}\n`
          }
        ],
        structuredContent: output
      };
    }
  );

  return name;
}
