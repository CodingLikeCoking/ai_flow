import type { RecordStatus, TaskBoundaryDecision } from "../types.js";

const REASON_WEIGHTS: Record<string, number> = {
  idle_gap: 1,
  explicit_completion: 1,
  success_marker: 1,
  session_end: 1,
  claude_task_completed: 1,
  task_switch: 1
};

export function scoreClosureSignals(
  taskSlug: string,
  reasons: string[]
): TaskBoundaryDecision {
  const score = reasons.reduce((sum, reason) => sum + (REASON_WEIGHTS[reason] ?? 0), 0);
  const shouldCloseTask = score >= 2;
  const status: RecordStatus = shouldCloseTask ? "resolved" : score > 0 ? "interrupted" : "open";

  return {
    taskSlug,
    shouldCloseTask,
    status,
    score,
    reasons
  };
}
