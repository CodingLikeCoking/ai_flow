import { readFile } from "node:fs/promises";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getProjectPaths } from "../../core/fs/paths.js";
import { readProjectRegistryEntry } from "../../core/registry/projectRegistry.js";
import type { AiFlowMcpContext } from "../server.js";

export function registerGetProjectStatusTool(
  server: McpServer,
  context: AiFlowMcpContext
): string {
  const name = "ai_flow_get_project_status";

  server.registerTool(
    name,
    {
      title: "Get Project Status",
      description: "Read the current status markdown for a project.",
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
    async ({ project_slug, response_format }) => {
      const entry = await readProjectRegistryEntry(context.config, project_slug);
      const text = entry
        ? await readFile(getProjectPaths(entry.projectPath, entry.projectSlug).projectStatusFile, "utf8")
        : "# Missing project\n";
      const output = { project_slug, found: Boolean(entry), text };

      return {
        content: [{ type: "text", text: response_format === "json" ? JSON.stringify(output, null, 2) : text }],
        structuredContent: output
      };
    }
  );

  return name;
}
