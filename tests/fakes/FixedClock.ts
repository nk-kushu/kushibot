import type { IClock } from "../../src/contracts/runtime/IClock.js";

export class FixedClock implements IClock {
  constructor(private readonly epochMs: number) {}

  nowEpochMs(): number {
    return this.epochMs;
  }
}
