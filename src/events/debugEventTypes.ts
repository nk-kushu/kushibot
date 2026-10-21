export const debugEventTypes = Object.freeze([
  "operation.started", "operation.completed", "operation.failed", "progress.reported",
  "policy.recommended", "policy.applied", "result.persisted", "cancellation.requested", "state.persisted",
] as const);
