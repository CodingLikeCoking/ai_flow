import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { applySuggestionToManagedBlock } from "../../core/suggestions/applySuggestion.js";

export function registerApplySuggestionTool(server: McpServer): string {
  const name = "ai_flow_apply_suggestion";

  server.registerTool(
    name,
    {
      title: "Apply Suggestion",
      description: "Apply a high-confidence suggestion into a managed block.",
      inputSchema: {
        summary: z.string().min(1),
        target_file: z.string().min(1),
        confidence: z.number().min(0).max(1).default(0.95),
        project_slug: z.string().min(1).default("global"),
        confirm_write: z.boolean()
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ summary, target_file, confidence, project_slug, confirm_write }) => {
      if (!confirm_write) {
        throw new Error("confirm_write must be true");
      }

      const applied = await applySuggestionToManagedBlock({
        id: `${project_slug}-${Date.now()}`,
        category: "project_config",
        projectSlug: project_slug,
        summary,
        targetFile: target_file,
        confidence,
        createdAt: new Date().toISOString()
      });
      const output = { applied };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  return name;
}
