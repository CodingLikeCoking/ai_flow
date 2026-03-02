import { readFile } from "node:fs/promises";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getProjectPaths } from "../../core/fs/paths.js";
import { readProjectRegistryEntry } from "../../core/registry/projectRegistry.js";
import type { AiFlowMcpContext } from "../server.js";

export function registerGetSetupGuideTool(
  server: McpServer,
  context: AiFlowMcpContext
): string {
  const name = "ai_flow_get_setup_guide";

  server.registerTool(
    name,
    {
      title: "Get Setup Guide",
      description: "Read a generated setup guide for a specific task.",
      inputSchema: {
        project_slug: z.string().min(1),
        task_slug: z.string().min(1),
        guide_slug: z.string().min(1),
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
    async ({ project_slug, task_slug, guide_slug, response_format }) => {
      const entry = await readProjectRegistryEntry(context.config, project_slug);
      const path = entry
        ? getProjectPaths(entry.projectPath, entry.projectSlug).setupGuideFile(task_slug, guide_slug)
        : "";
      const text = path ? await safeRead(path) : "# Missing project\n";
      const output = { found: Boolean(entry), path, text };

      return {
        content: [{ type: "text", text: response_format === "json" ? JSON.stringify(output, null, 2) : text }],
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
    return "# Setup guide not found\n";
  }
}
