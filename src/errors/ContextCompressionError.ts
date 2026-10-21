export class ContextCompressionError extends Error {
  readonly code = "CONTEXT_COMPRESSION_INVALID";
  constructor() { super("Context compression configuration, source selection, or summary record is invalid."); this.name = "ContextCompressionError"; }
}
