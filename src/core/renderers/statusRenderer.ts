import type { ProjectStatusSnapshot } from "../types.js";

export function renderStatusMarkdown(snapshot: ProjectStatusSnapshot): string {
  return [
    `# ${snapshot.projectName} Status`,
    "",
    `- Project slug: ${snapshot.projectSlug}`,
    `- Updated at: ${snapshot.updatedAt}`,
    `- Current phase: ${snapshot.phase}`,
    "",
    "## Purpose",
    snapshot.purpose,
    "",
    "## Completed Tasks",
    snapshot.completedTasks.length > 0
      ? snapshot.completedTasks.map((item) => `- ${item}`).join("\n")
      : "- None",
    "",
    "## Open Tasks",
    snapshot.openTasks.length > 0 ? snapshot.openTasks.map((item) => `- ${item}`).join("\n") : "- None",
    "",
    "## Deliverables",
    snapshot.deliverables.length > 0
      ? snapshot.deliverables.map((item) => `- ${item}`).join("\n")
      : "- None",
    "",
    "## Current Blockers",
    snapshot.blockers.length > 0 ? snapshot.blockers.map((item) => `- ${item}`).join("\n") : "- None",
    "",
    "## Next Directions",
    snapshot.nextDirections.length > 0
      ? snapshot.nextDirections.map((item) => `- ${item}`).join("\n")
      : "- None",
    ""
  ].join("\n");
}
