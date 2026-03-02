import type { NormalizedRecord } from "../types.js";

export function renderPromptMarkdown(record: NormalizedRecord): string {
  return [
    `# [AGENT] ${record.kind === "PLAN" ? "Plan" : "Prompt"} — ${record.taskSlug}`,
    "",
    `- Timestamp: ${record.endedAt}`,
    `- Agent: ${record.agent}`,
    `- Session ID: ${record.sessionId}`,
    `- Capture Fidelity: ${record.captureFidelity}`,
    `- Status: ${record.status}`,
    "",
    "## User Prompt",
    record.userText || "_No full user prompt captured._",
    "",
    "## Agent Response",
    record.assistantText || "_No assistant response captured._",
    "",
    "## What Happened",
    record.summary,
    "",
    "## What Fixed It",
    record.summary,
    "",
    "## What Should Have Been Included Upfront",
    record.configNeeded.length > 0 ? record.configNeeded.join("\n") : "No extra prerequisites identified.",
    "",
    "## Files Changed",
    record.filesChanged.length > 0 ? record.filesChanged.map((file) => `- ${file}`).join("\n") : "- None captured",
    "",
    "## Config Needed",
    record.configNeeded.length > 0 ? record.configNeeded.map((item) => `- ${item}`).join("\n") : "- None",
    "",
    "## Reusable Pattern Candidates",
    record.reusablePatterns.length > 0
      ? record.reusablePatterns.map((item) => `- ${item}`).join("\n")
      : "- None",
    "",
    "## Build vs Buy Notes",
    record.buildVsBuy.length > 0
      ? record.buildVsBuy.map((option) => `- ${option.source}: ${option.name} (${option.rationale})`).join("\n")
      : "- No external options captured",
    "",
    "## One Prompt Next Time",
    record.onePromptNextTime,
    "",
    "## Next Directions",
    record.nextDirections.length > 0
      ? record.nextDirections.map((item) => `- ${item}`).join("\n")
      : "- None",
    ""
  ].join("\n");
}
