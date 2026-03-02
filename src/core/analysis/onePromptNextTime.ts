import type { NormalizedRecord } from "../types.js";

export function buildOnePromptNextTime(record: Pick<
  NormalizedRecord,
  "taskSlug" | "userText" | "summary" | "configNeeded"
>): string {
  const configSection =
    record.configNeeded.length > 0
      ? ` Include these prerequisites up front: ${record.configNeeded.join(", ")}.`
      : "";

  return `Handle the "${record.taskSlug}" task end-to-end in one pass. First check for existing tools or libraries to reuse, then implement the minimal solution, run validation, and summarize the outcome.${configSection}`;
}
