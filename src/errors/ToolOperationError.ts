export class ToolOperationError extends Error {
  readonly code = "TOOL_OPERATION_INVALID";
  constructor() { super("Tool registration, operation identity, or journal state is invalid."); this.name = "ToolOperationError"; }
}
