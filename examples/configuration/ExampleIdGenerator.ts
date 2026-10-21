import type { IIdGenerator } from "../../src/index.js";

export class ExampleIdGenerator implements IIdGenerator {
  private sequence = 0;

  nextId(): string {
    this.sequence += 1;
    return `example-operation-${this.sequence}`;
  }
}
