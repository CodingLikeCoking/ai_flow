import type { AiFlowConfig } from "../types.js";
import { writeTextFile, writeJsonFile } from "../fs/fileIO.js";
import { getGlobalProjectPaths } from "../fs/paths.js";

export async function writeGlobalProjectMirror(
  config: AiFlowConfig,
  projectSlug: string,
  projectName: string,
  files: {
    projectStatus: string;
    timeline: string;
    records?: Array<{ fileName: string; contents: string }>;
  }
): Promise<void> {
  const paths = getGlobalProjectPaths(projectSlug, config.paths.desktopDir);
  await Promise.all([
    writeTextFile(paths.indexFile, `# ${projectName}\n\n- Project slug: ${projectSlug}\n`),
    writeTextFile(paths.projectStatusFile, files.projectStatus),
    writeTextFile(paths.timelineFile, files.timeline),
    writeJsonFile(paths.projectMapFile, {
      projectSlug,
      projectName,
      mirroredAt: new Date().toISOString()
    }),
    ...(files.records ?? []).map((record) =>
      writeTextFile(`${paths.projectDir}/records/${record.fileName}`, record.contents)
    )
  ]);
}
