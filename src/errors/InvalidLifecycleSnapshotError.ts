export class InvalidLifecycleSnapshotError extends Error {
  readonly code = "INVALID_LIFECYCLE_SNAPSHOT";

  constructor(message: string) {
    super(message);
    this.name = "InvalidLifecycleSnapshotError";
  }
}
