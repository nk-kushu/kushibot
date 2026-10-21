export class ContextCompositionError extends Error {
  readonly code = "CONTEXT_COMPOSITION_INVALID";
  constructor() { super("Context input, selection, sizing, or configuration is invalid."); this.name = "ContextCompositionError"; }
}
