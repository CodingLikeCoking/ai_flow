import { readFile } from "node:fs/promises";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getProjectPaths } from "../../core/fs/paths.js";
import { readProjectRegistryEntry } from "../../core/registry/projectRegistry.js";
import type { AiFlowMcpContext } from "../server.js";

export function registerListSuggestionsTool(
  server: McpServer,
  context: AiFlowMcpContext
): string {
  const name = "ai_flow_list_suggestions";

  server.registerTool(
    name,
    {
      title: "List Suggestions",
      description: "Read the suggestion backlog markdown files for a project.",
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
      if (!entry) {
        const output = { project_slug, items: [] as string[] };
        return {
          content: [{ type: "text", text: response_format === "json" ? JSON.stringify(output, null, 2) : "# Suggestions\n\n" }],
          structuredContent: output
        };
      }

      const paths = getProjectPaths(entry.projectPath, entry.projectSlug);
      const items = await Promise.all([
        safeRead(paths.skillBacklogFile),
        safeRead(paths.automationBacklogFile)
      ]);
      const output = { project_slug, items };

      return {
        content: [{ type: "text", text: response_format === "json" ? JSON.stringify(output, null, 2) : items.join("\n\n") }],
        structuredContent: output
      };
    }
  );

  return name;
}

async function safeRead(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "# Suggestions\n\n";
  }
}
