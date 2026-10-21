export class InvalidExecutionIdentityError extends Error {
  readonly code = "INVALID_EXECUTION_IDENTITY";

  constructor(message: string) {
    super(message);
    this.name = "InvalidExecutionIdentityError";
  }
}
