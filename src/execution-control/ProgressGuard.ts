import type { ExecutionStopReason } from "./ExecutionStopReason.js";
import { BudgetAccountingError } from "../errors/BudgetAccountingError.js";
export class ProgressGuard {
  private previous: string | null = null;
  private repetitions = 0;
  constructor(private readonly maxRepeatedObservations: number) {
    if (!Number.isSafeInteger(maxRepeatedObservations) || maxRepeatedObservations < 1) throw new BudgetAccountingError();
  }
  observe(fingerprint: string): ExecutionStopReason | null {
    if (!/^[a-zA-Z0-9_.:-]{1,128}$/.test(fingerprint)) throw new BudgetAccountingError();
    this.repetitions = fingerprint === this.previous ? this.repetitions + 1 : 1;
    this.previous = fingerprint;
    return this.repetitions >= this.maxRepeatedObservations ? { code: "no-progress", message: "Repeated observations show no useful progress." } : null;
  }
}
