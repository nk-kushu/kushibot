import type { IMonotonicClock } from "./IMonotonicClock.js";

export class PerformanceMonotonicClock implements IMonotonicClock {
  constructor(private readonly performance: Pick<Performance, "now">) {}
  nowMs(): number { return this.performance.now(); }
}
