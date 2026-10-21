export class WorkflowRunError extends Error { readonly code="WORKFLOW_RUN_INVALID";constructor(){super("Workflow run state, binding, owner, or decision is invalid.");this.name="WorkflowRunError";} }
