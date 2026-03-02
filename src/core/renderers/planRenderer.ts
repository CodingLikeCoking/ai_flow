import type { NormalizedRecord } from "../types.js";

export function renderPlanMarkdown(record: NormalizedRecord): string {
  const cleanedPlan = normalizePlanText(record.assistantText);

  return [
    `# [PLAN] Plan — ${record.taskSlug}`,
    "",
    `- Timestamp: ${record.endedAt}`,
    `- Agent: ${record.agent}`,
    "",
    "## Planning Q&A",
    record.userText || "No user-side planning Q&A was captured.",
    "",
    "## Final Plan",
    cleanedPlan,
    "",
    "## Assumptions",
    record.summary,
    "",
    "## Acceptance Criteria",
    record.nextDirections.length > 0 ? record.nextDirections.map((item) => `- ${item}`).join("\n") : "- Review implementation output",
    ""
  ].join("\n");
}

function normalizePlanText(text: string): string {
  const trimmed = text.trim();

  if (trimmed.startsWith("<proposed_plan>") && trimmed.endsWith("</proposed_plan>")) {
    return trimmed
      .replace(/^<proposed_plan>\s*/, "")
      .replace(/\s*<\/proposed_plan>$/, "")
      .trim();
  }

  if (trimmed.startsWith("<proposed_plan>")) {
    return trimmed.replace(/^<proposed_plan>\s*/, "").trim();
  }

  return trimmed || "No final plan was captured.";
}
