/** Generates identifiers; persistence and duplicate-delivery protection are separate concerns. */
export interface IIdGenerator {
  nextId(): string;
}
