import type { AdapterEvent, TaskBoundaryDecision } from "../types.js";

import { scoreClosureSignals } from "./closureScorer.js";

const COMPLETION_PATTERN = /\b(done|fixed|implemented|completed|resolved|shipped)\b/i;
const SUCCESS_PATTERN = /\b(pass|build succeeded|tests passed|0 failed)\b/i;

export function assessTaskBoundary(
  taskSlug: string,
  events: AdapterEvent[]
): TaskBoundaryDecision {
  const reasons = new Set<string>();
  const assistantText = events
    .filter((event) => event.role === "assistant")
    .map((event) => event.text)
    .join("\n");

  if (COMPLETION_PATTERN.test(assistantText)) {
    reasons.add("explicit_completion");
  }

  if (SUCCESS_PATTERN.test(assistantText)) {
    reasons.add("success_marker");
  }

  if (events.some((event) => event.metadata?.hookEvent === "TaskCompleted")) {
    reasons.add("claude_task_completed");
  }

  if (events.some((event) => event.metadata?.sessionEnded === true)) {
    reasons.add("session_end");
  }

  if (events.length > 1) {
    const first = Date.parse(events[0].timestamp);
    const last = Date.parse(events[events.length - 1].timestamp);
    if (Number.isFinite(first) && Number.isFinite(last) && last - first >= 10 * 60 * 1000) {
      reasons.add("idle_gap");
    }
  }

  return scoreClosureSignals(taskSlug, [...reasons]);
}
