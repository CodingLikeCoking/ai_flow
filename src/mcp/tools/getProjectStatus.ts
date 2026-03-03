import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { rebuildProjectStatus } from "../../core/actions/rebuildStatus.js";
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
      description: "Read the current status for a project, computed from stored records.",
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
      const project = context.db.getProject(project_slug);
      if (!project) {
        const output = { project_slug, found: false, text: "# Missing project\n" };
        return {
          content: [{ type: "text", text: response_format === "json" ? JSON.stringify(output, null, 2) : output.text }],
          structuredContent: output
        };
      }

      const view = await rebuildProjectStatus(
        context.config,
        project.projectName,
        project.projectPath,
        project.projectSlug,
        [],
        context.db
      );

      const output = { project_slug, found: true, text: view.statusMarkdown };
      return {
        content: [{ type: "text", text: response_format === "json" ? JSON.stringify(output, null, 2) : view.statusMarkdown }],
        structuredContent: output
      };
    }
  );

  return name;
}
