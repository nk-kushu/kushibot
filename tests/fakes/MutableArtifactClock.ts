import type { IClock } from "../../src/contracts/runtime/IClock.js";

export class MutableArtifactClock implements IClock {
  constructor(private epochMs: number) {}
  nowEpochMs(): number { return this.epochMs; }
  advance(milliseconds: number): void {
    if (!Number.isSafeInteger(milliseconds) || milliseconds < 0 || !Number.isSafeInteger(this.epochMs + milliseconds)) {
      throw new Error("Invalid fixture time advance.");
    }
    this.epochMs += milliseconds;
  }
}
