import type { AiFlowConfig, NormalizedRecord } from "../types.js";
import { getProjectPaths } from "../fs/paths.js";
import { renderStatusMarkdown } from "../renderers/statusRenderer.js";
import { renderTimelineMarkdown } from "../renderers/timelineRenderer.js";
import { buildProjectStatusSnapshot } from "../analysis/projectStatus.js";
import { writeTextFile } from "../fs/fileIO.js";

export async function rebuildProjectStatus(
  config: AiFlowConfig,
  projectName: string,
  projectPath: string,
  projectSlug: string,
  records: NormalizedRecord[]
): Promise<void> {
  const snapshot = buildProjectStatusSnapshot(projectName, projectSlug, records);
  const paths = getProjectPaths(projectPath, projectSlug);

  await Promise.all([
    writeTextFile(paths.projectStatusFile, renderStatusMarkdown(snapshot)),
    writeTextFile(paths.timelineFile, renderTimelineMarkdown(snapshot))
  ]);
}
