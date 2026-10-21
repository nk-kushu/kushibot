export class InvalidLifecycleTransitionError extends Error {
  readonly code = "INVALID_LIFECYCLE_TRANSITION";

  constructor(message: string) {
    super(message);
    this.name = "InvalidLifecycleTransitionError";
  }
}
