import type { SetupGuide } from "../types.js";

export function renderSetupGuideMarkdown(guide: SetupGuide): string {
  return [
    `# ${guide.title}`,
    "",
    guide.summary,
    "",
    ...guide.steps.flatMap((step, index) => [
      `## Step ${index + 1}: ${step.title}`,
      `- Action: ${step.action}`,
      `- Why: ${step.reason}`,
      `- Verify: ${step.verification}`,
      ""
    ])
  ].join("\n");
}
