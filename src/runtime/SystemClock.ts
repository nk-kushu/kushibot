import type { IClock } from "../contracts/runtime/IClock.js";

/** Default wall clock for library components. */
export class SystemClock implements IClock {
  nowEpochMs(): number {
    return Date.now();
  }
}
