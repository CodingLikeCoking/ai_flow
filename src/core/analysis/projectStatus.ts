import type { NormalizedRecord, ProjectStatusSnapshot } from "../types.js";

export function buildProjectStatusSnapshot(
  projectName: string,
  projectSlug: string,
  records: NormalizedRecord[]
): ProjectStatusSnapshot {
  const completedTasks = records
    .filter((record) => record.status === "resolved")
    .map((record) => record.taskSlug);
  const openTasks = records
    .filter((record) => record.status !== "resolved")
    .map((record) => record.taskSlug);
  const latest = records.at(-1);

  return {
    projectSlug,
    projectName,
    purpose: `Track and improve AI-assisted work for ${projectName}.`,
    phase: latest?.status === "resolved" ? "Stable" : "In progress",
    completedTasks,
    openTasks,
    timelineHighlights: records.map(
      (record) => `${record.startedAt}: ${record.taskSlug} (${record.status})`
    ),
    deliverables: records.flatMap((record) => record.deliverables),
    blockers: latest?.status === "resolved" ? [] : ["Task closure not fully confirmed"],
    nextDirections: latest?.nextDirections ?? ["Review the latest suggestions"],
    updatedAt: new Date().toISOString()
  };
}
