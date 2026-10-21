export type LifecycleStatus =
  | "created" | "queued" | "active" | "retry-wait" | "waiting-for-approval"
  | "paused" | "interrupted" | "recovering" | "stopping"
  | "completed" | "failed" | "stopped" | "cancelled";
