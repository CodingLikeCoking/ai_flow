import {
  McpServer,
  ResourceTemplate
} from "@modelcontextprotocol/sdk/server/mcp.js";

import { rebuildProjectStatus } from "../core/actions/rebuildStatus.js";
import { renderPromptMarkdown } from "../core/renderers/promptRenderer.js";
import { renderPlanMarkdown } from "../core/renderers/planRenderer.js";
import type { AiFlowMcpContext } from "./server.js";

export function registerAiFlowResources(
  server: McpServer,
  context: AiFlowMcpContext
): string[] {
  const names = ["ai-flow://projects"];

  server.registerResource(
    "projects",
    "ai-flow://projects",
    {
      title: "Projects",
      description: "All registered ai-flow projects."
    },
    async (uri) => {
      const { items } = context.db.listProjects(100, 0);
      return {
        contents: [
          {
            uri: uri.toString(),
            text: `# Projects\n\n${items.map((e) => `- ${e.projectSlug}`).join("\n")}\n`,
            mimeType: "text/markdown"
          }
        ]
      };
    }
  );

  registerProjectTemplateResource(
    server,
    context,
    "project-status",
    "ai-flow://project/{project_slug}/status",
    async (projectSlug) => {
      const project = context.db.getProject(projectSlug);
      if (!project) return "# Missing project\n";
      const view = await rebuildProjectStatus(
        context.config,
        project.projectName,
        project.projectPath,
        project.projectSlug,
        [],
        context.db
      );
      return view.statusMarkdown;
    },
    names
  );

  registerProjectTemplateResource(
    server,
    context,
    "project-timeline",
    "ai-flow://project/{project_slug}/timeline",
    async (projectSlug) => {
      const project = context.db.getProject(projectSlug);
      if (!project) return "# Missing project\n";
      const view = await rebuildProjectStatus(
        context.config,
        project.projectName,
        project.projectPath,
        project.projectSlug,
        [],
        context.db
      );
      return view.timelineMarkdown;
    },
    names
  );

  registerProjectTemplateResource(
    server,
    context,
    "project-patterns",
    "ai-flow://project/{project_slug}/patterns",
    async (projectSlug) => {
      const records = context.db.allRecords(projectSlug);
      const allPatterns = records.flatMap((r) => r.reusablePatterns);
      if (allPatterns.length === 0) return "# Reusable Patterns\n\nNone captured yet.\n";
      const unique = [...new Set(allPatterns)];
      return `# Reusable Patterns\n\n${unique.map((p) => `- ${p}`).join("\n")}\n`;
    },
    names
  );

  server.registerResource(
    "project-record",
    new ResourceTemplate("ai-flow://project/{project_slug}/records/{record_id}", {
      list: undefined
    }),
    {
      title: "Project Record",
      description: "Read a specific project record by ID."
    },
    async (uri, variables) => {
      const recordId = String(variables.record_id ?? "");
      const record = context.db.getRecord(recordId);

      const text = record
        ? (record.kind === "PLAN" ? renderPlanMarkdown(record) : renderPromptMarkdown(record))
        : "# Missing record\n";

      return {
        contents: [
          {
            uri: uri.toString(),
            text,
            mimeType: "text/markdown"
          }
        ]
      };
    }
  );
  names.push("ai-flow://project/{project_slug}/records/{record_id}");

  return names;
}

function registerProjectTemplateResource(
  server: McpServer,
  _context: AiFlowMcpContext,
  name: string,
  template: string,
  getText: (projectSlug: string) => Promise<string>,
  names: string[]
): void {
  server.registerResource(
    name,
    new ResourceTemplate(template, { list: undefined }),
    {
      title: name,
      description: `Resource for ${template}`
    },
    async (uri, variables) => {
      const projectSlug = String(variables.project_slug ?? "");
      return {
        contents: [
          {
            uri: uri.toString(),
            text: await getText(projectSlug),
            mimeType: "text/markdown"
          }
        ]
      };
    }
  );

  names.push(template);
}
