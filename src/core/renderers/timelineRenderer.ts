import type { ProjectStatusSnapshot } from "../types.js";

export function renderTimelineMarkdown(snapshot: ProjectStatusSnapshot): string {
  return [
    "# Timeline",
    "",
    ...snapshot.timelineHighlights.map((item) => `- ${item}`),
    ""
  ].join("\n");
}
