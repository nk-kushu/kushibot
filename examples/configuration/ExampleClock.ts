import type { IClock } from "../../src/index.js";

export class ExampleClock implements IClock {
  nowEpochMs(): number {
    return 1000;
  }
}
