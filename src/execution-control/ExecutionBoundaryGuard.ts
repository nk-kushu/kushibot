import type { IClock } from "../contracts/runtime/IClock.js";
import type { ExecutionStopReason } from "./ExecutionStopReason.js";
import { BudgetAccountingError } from "../errors/BudgetAccountingError.js";
export class ExecutionBoundaryGuard {
  constructor(private readonly clock: IClock, private readonly signal: AbortSignal, private readonly deadlineEpochMs: number | null) {
    if (deadlineEpochMs !== null && (!Number.isSafeInteger(deadlineEpochMs) || deadlineEpochMs < 0)) throw new BudgetAccountingError();
  }
  check(): ExecutionStopReason | null {
    if (this.signal.aborted) return { code: "cancelled", message: "Execution was cancelled." };
    const now = this.clock.nowEpochMs();
    if (!Number.isSafeInteger(now) || now < 0) throw new BudgetAccountingError();
    if (this.deadlineEpochMs !== null && now >= this.deadlineEpochMs) return { code: "deadline-reached", message: "Execution deadline was reached." };
    return null;
  }
}
