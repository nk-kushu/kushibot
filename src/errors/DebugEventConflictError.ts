export class DebugEventConflictError extends Error {
  readonly code = "DEBUG_EVENT_CONFLICT";
  constructor() { super("Debug event ID already has different content."); this.name = "DebugEventConflictError"; }
}
