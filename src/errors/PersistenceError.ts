/** Represents a persistence failure without claiming that the attempted write was saved. */
export class PersistenceError extends Error {
  readonly code = "PERSISTENCE_FAILED";

  constructor(safeMessage: string) {
    super(safeMessage);
    this.name = "PersistenceError";
  }
}
