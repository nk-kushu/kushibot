export class DecisionRequestError extends Error {
  readonly code = "DECISION_REQUEST_INVALID";
  constructor() { super("Decision request is invalid."); this.name = "DecisionRequestError"; }
}
