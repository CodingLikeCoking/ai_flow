import type { AiFlowConfig, NormalizedRecord } from "../types.js";
import { buildProjectStatusSnapshot } from "../analysis/projectStatus.js";
import { AiFlowDatabase, openDatabase } from "../db/database.js";
import { renderStatusMarkdown } from "../renderers/statusRenderer.js";
import { renderTimelineMarkdown } from "../renderers/timelineRenderer.js";

export interface ProjectStatusView {
  statusMarkdown: string;
  timelineMarkdown: string;
}

export async function rebuildProjectStatus(
  config: AiFlowConfig,
  projectName: string,
  _projectPath: string,
  projectSlug: string,
  records: NormalizedRecord[],
  db?: AiFlowDatabase
): Promise<ProjectStatusView> {
  const ownDb = db ?? openDatabase(config);
  const shouldClose = !db;

  try {
    const allRecords =
      records.length > 0 ? records : ownDb.listRecords(projectSlug, {}, 1000, 0).items;
    const snapshot = buildProjectStatusSnapshot(projectName, projectSlug, allRecords);
    return {
      statusMarkdown: renderStatusMarkdown(snapshot),
      timelineMarkdown: renderTimelineMarkdown(snapshot)
    };
  } finally {
    if (shouldClose) ownDb.close();
  }
}
