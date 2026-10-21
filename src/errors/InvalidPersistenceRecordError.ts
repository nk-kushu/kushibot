export class InvalidPersistenceRecordError extends Error {
  readonly code = "INVALID_PERSISTENCE_RECORD";

  constructor(message: string) {
    super(message);
    this.name = "InvalidPersistenceRecordError";
  }
}
