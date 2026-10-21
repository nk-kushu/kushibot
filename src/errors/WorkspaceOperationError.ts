export class WorkspaceOperationError extends Error {
  readonly code = "WORKSPACE_OPERATION_INVALID";
  constructor() { super("Workspace scope, path, revision, or editing ownership is invalid."); this.name = "WorkspaceOperationError"; }
}
