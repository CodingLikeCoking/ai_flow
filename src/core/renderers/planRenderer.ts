import type { NormalizedRecord } from "../types.js";

export function renderPlanMarkdown(record: NormalizedRecord): string {
  return [
    `# [PLAN] Plan — ${record.taskSlug}`,
    "",
    `- Timestamp: ${record.endedAt}`,
    `- Agent: ${record.agent}`,
    "",
    "## Plan",
    record.assistantText,
    "",
    "## Assumptions",
    record.summary,
    "",
    "## Acceptance Criteria",
    record.nextDirections.length > 0 ? record.nextDirections.map((item) => `- ${item}`).join("\n") : "- Review implementation output",
    ""
  ].join("\n");
}
