import { slugifyProjectName } from "../fs/paths.js";
import type { AiFlowConfig, ProjectRegistryEntry } from "../types.js";
import { AiFlowDatabase, openDatabase } from "../db/database.js";

export interface InitProjectOptions {
  config: AiFlowConfig;
  projectPath: string;
  projectName: string;
  db?: AiFlowDatabase;
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

  const db = options.db ?? openDatabase(options.config);
  const shouldCloseDb = !options.db;

  try {
    db.upsertProject(entry);
  } finally {
    if (shouldCloseDb) db.close();
  }

  return {
    projectSlug,
    entry
  };
}
