export class ModelRequestError extends Error {
  readonly code = "MODEL_REQUEST_INVALID";
  constructor() { super("Model request or configured capability is invalid."); this.name = "ModelRequestError"; }
}
