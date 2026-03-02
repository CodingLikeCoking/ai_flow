import { join } from "node:path";

import type { AiFlowConfig, ProjectRegistryEntry } from "../types.js";
import { readJsonFile, writeJsonFile } from "../fs/fileIO.js";

export function getProjectRegistryFile(
  config: AiFlowConfig,
  projectSlug: string
): string {
  return join(config.paths.projectsDir, `${projectSlug}.json`);
}

export async function writeProjectRegistryEntry(
  config: AiFlowConfig,
  entry: ProjectRegistryEntry
): Promise<void> {
  await writeJsonFile(getProjectRegistryFile(config, entry.projectSlug), entry);
}

export async function readProjectRegistryEntry(
  config: AiFlowConfig,
  projectSlug: string
): Promise<ProjectRegistryEntry | null> {
  return readJsonFile<ProjectRegistryEntry>(getProjectRegistryFile(config, projectSlug));
}
