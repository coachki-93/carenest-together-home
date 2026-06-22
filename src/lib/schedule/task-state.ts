// Shared helper that decides whether a pending scheduled task is still on
// time, already "late" (yellow), or "missed" (red), based on the per-task
// thresholds chosen when the task was created.

export type TaskState =
  | "pending"
  | "late"
  | "missed"
  | "given"
  | "skipped"
  | "postponed";

export interface TaskStateInput {
  status: "pending" | "given" | "skipped" | "postponed";
  scheduledFor: Date;
  /** Minutes after scheduled time before the task turns yellow ("late"). */
  lateAfterMinutes: number;
  /** Minutes after scheduled time before the task turns red ("missed"). */
  missedAfterMinutes: number;
  now: Date;
  /** All-day tasks never go late/missed. */
  allDay?: boolean;
}

export function getTaskState({
  status,
  scheduledFor,
  lateAfterMinutes,
  missedAfterMinutes,
  now,
  allDay,
}: TaskStateInput): TaskState {
  if (status !== "pending") return status;
  if (allDay) return "pending";
  const diffMin = (now.getTime() - scheduledFor.getTime()) / 60000;
  const lateThresh = Math.max(0, lateAfterMinutes);
  const missedThresh = Math.max(lateThresh, missedAfterMinutes);
  if (diffMin >= missedThresh) return "missed";
  if (diffMin >= lateThresh && diffMin >= 0) return "late";
  return "pending";
}
