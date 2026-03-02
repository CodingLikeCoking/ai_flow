import { mkdir } from "node:fs/promises";

import { getGlobalProjectPaths, getProjectPaths, slugifyProjectName } from "../fs/paths.js";
import { writeTextFile } from "../fs/fileIO.js";
import { writeProjectRegistryEntry } from "../registry/projectRegistry.js";
import type { AiFlowConfig, ProjectRegistryEntry } from "../types.js";

export interface InitProjectOptions {
  config: AiFlowConfig;
  projectPath: string;
  projectName: string;
}

export async function initProject(options: InitProjectOptions): Promise<{
  projectSlug: string;
  entry: ProjectRegistryEntry;
}> {
  const projectSlug = slugifyProjectName(options.projectName);
  const now = new Date().toISOString();
  const entry: ProjectRegistryEntry = {
    projectSlug,
    projectName: options.projectName,
    projectPath: options.projectPath,
    createdAt: now,
    updatedAt: now
  };

  const localPaths = getProjectPaths(options.projectPath, projectSlug);
  const globalPaths = getGlobalProjectPaths(projectSlug, options.config.paths.desktopDir);

  await mkdir(localPaths.projectMetaDir, { recursive: true });
  await mkdir(globalPaths.projectDir, { recursive: true });

  await Promise.all([
    writeTextFile(
      localPaths.projectStatusFile,
      buildProjectStatusMarkdown(options.projectName, projectSlug, now)
    ),
    writeTextFile(localPaths.timelineFile, "# Timeline\n\n"),
    writeTextFile(localPaths.reusablePatternsFile, "# Reusable Patterns\n\n"),
    writeTextFile(localPaths.skillBacklogFile, "# Skill Backlog\n\n"),
    writeTextFile(localPaths.automationBacklogFile, "# Automation Backlog\n\n"),
    writeTextFile(globalPaths.indexFile, `# ${options.projectName}\n\n- Project slug: ${projectSlug}\n`),
    writeTextFile(globalPaths.projectStatusFile, buildProjectStatusMarkdown(options.projectName, projectSlug, now)),
    writeTextFile(globalPaths.timelineFile, "# Timeline\n\n")
  ]);

  await writeProjectRegistryEntry(options.config, entry);

  return {
    projectSlug,
    entry
  };
}

function buildProjectStatusMarkdown(
  projectName: string,
  projectSlug: string,
  timestamp: string
): string {
  return [
    `# ${projectName} Status`,
    "",
    `- Project slug: ${projectSlug}`,
    `- Updated at: ${timestamp}`,
    "- Current phase: Bootstrapped",
    "",
    "## Completed Tasks",
    "- Project initialized",
    "",
    "## Open Tasks",
    "- Start passive scanning",
    "",
    "## Next Directions",
    "- Configure the collector",
    ""
  ].join("\n");
}
