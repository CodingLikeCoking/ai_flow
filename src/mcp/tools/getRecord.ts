import { readFile } from "node:fs/promises";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerGetRecordTool(server: McpServer): string {
  const name = "ai_flow_get_record";

  server.registerTool(
    name,
    {
      title: "Get Record",
      description: "Read a record markdown file by absolute path.",
      inputSchema: {
        file_path: z.string().min(1),
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
    async ({ file_path, response_format }) => {
      const text = await readFile(file_path, "utf8");
      const output = { file_path, text };
      return {
        content: [{ type: "text", text: response_format === "json" ? JSON.stringify(output, null, 2) : text }],
        structuredContent: output
      };
    }
  );

  return name;
}
