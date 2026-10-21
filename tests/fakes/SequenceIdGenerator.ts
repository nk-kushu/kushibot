import type { IIdGenerator } from "../../src/contracts/runtime/IIdGenerator.js";

export class SequenceIdGenerator implements IIdGenerator {
  private readonly ids: readonly string[];
  private cursor = 0;

  constructor(ids: readonly string[]) {
    this.ids = [...ids];
  }

  nextId(): string {
    const id = this.ids[this.cursor];
    if (id === undefined) {
      throw new Error("Test identifier sequence exhausted.");
    }
    this.cursor += 1;
    return id;
  }
}
