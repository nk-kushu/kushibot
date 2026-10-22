import type { IDebugHealthReporter } from "./IDebugHealthReporter.js";
import type { DebugHealthCode } from "./DebugHealthCode.js";

export class DebugHealthCounter implements IDebugHealthReporter {
  private readonly counts: Record<DebugHealthCode, number> = {
    "capture-failed": 0, "queue-full": 0, "delivery-failed": 0, "delivery-timeout": 0, "delivery-quarantined": 0,
  };
  record(code: DebugHealthCode): void { this.counts[code] = Math.min(Number.MAX_SAFE_INTEGER, this.counts[code] + 1); }
  snapshot(): Readonly<Record<DebugHealthCode, number>> { return Object.freeze({ ...this.counts }); }
}
