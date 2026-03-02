import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { initProject } from "../../core/actions/initProject.js";
import type { AiFlowMcpContext } from "../server.js";

export function registerRegisterProjectTool(
  server: McpServer,
  context: AiFlowMcpContext
): string {
  const name = "ai_flow_register_project";

  server.registerTool(
    name,
    {
      title: "Register Project",
      description: "Register a project and create the ai-flow prompt skeleton.",
      inputSchema: {
        project_path: z.string().min(1),
        project_name: z.string().min(1),
        confirm_write: z.boolean()
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ project_path, project_name, confirm_write }) => {
      if (!confirm_write) {
        throw new Error("confirm_write must be true");
      }

      const result = await initProject({
        config: context.config,
        projectPath: project_path,
        projectName: project_name
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result
      };
    }
  );

  return name;
}
