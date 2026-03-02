import { readFile } from "node:fs/promises";

import fg from "fast-glob";
import {
  McpServer,
  ResourceTemplate
} from "@modelcontextprotocol/sdk/server/mcp.js";

import { getProjectPaths } from "../core/fs/paths.js";
import { readProjectRegistryEntry } from "../core/registry/projectRegistry.js";
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
      const files = await fg("*.json", {
        cwd: context.config.paths.projectsDir,
        absolute: true,
        suppressErrors: true
      });
      const items = files.map((file) => file.split("/").at(-1)?.replace(/\.json$/, ""));
      return {
        contents: [
          {
            uri: uri.toString(),
            text: `# Projects\n\n${items.map((item) => `- ${item}`).join("\n")}\n`,
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
      const entry = await readProjectRegistryEntry(context.config, projectSlug);
      if (!entry) {
        return "# Missing project\n";
      }
      return safeRead(getProjectPaths(entry.projectPath, entry.projectSlug).projectStatusFile);
    },
    names
  );

  registerProjectTemplateResource(
    server,
    context,
    "project-timeline",
    "ai-flow://project/{project_slug}/timeline",
    async (projectSlug) => {
      const entry = await readProjectRegistryEntry(context.config, projectSlug);
      if (!entry) {
        return "# Missing project\n";
      }
      return safeRead(getProjectPaths(entry.projectPath, entry.projectSlug).timelineFile);
    },
    names
  );

  registerProjectTemplateResource(
    server,
    context,
    "project-patterns",
    "ai-flow://project/{project_slug}/patterns",
    async (projectSlug) => {
      const entry = await readProjectRegistryEntry(context.config, projectSlug);
      if (!entry) {
        return "# Missing project\n";
      }
      return safeRead(getProjectPaths(entry.projectPath, entry.projectSlug).reusablePatternsFile);
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
      description: "Read a specific project record by file fragment."
    },
    async (uri, variables) => {
      const projectSlug = String(variables.project_slug ?? "");
      const recordId = String(variables.record_id ?? "");
      const entry = await readProjectRegistryEntry(context.config, projectSlug);
      if (!entry) {
        return {
          contents: [
            {
              uri: uri.toString(),
              text: "# Missing project\n",
              mimeType: "text/markdown"
            }
          ]
        };
      }

      const files = await fg("**/*.md", {
        cwd: `${entry.projectPath}/prompt`,
        absolute: true,
        suppressErrors: true
      });
      const match = files.find((file) => file.includes(recordId));

      return {
        contents: [
          {
            uri: uri.toString(),
            text: match ? await safeRead(match) : "# Missing record\n",
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
  context: AiFlowMcpContext,
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
  void context;
}

async function safeRead(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "# File not found\n";
  }
}
