import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
import type { CollectedWork } from "./CollectedWork.js";
import type { ExecutionStopReason } from "./ExecutionStopReason.js";
import { BudgetAccountingError } from "../errors/BudgetAccountingError.js";
export class PartialOutcomeFactory {
  stopped<TResult>(reason: ExecutionStopReason, work: CollectedWork): ExecutionOutcome<TResult> {
    this.text(reason.message, 512); this.text(work.partial.summary, 4096);
    if (!["limit-reached", "deadline-reached", "cancelled", "no-progress"].includes(reason.code)) throw new BudgetAccountingError();
    return Object.freeze({ status: "stopped", reason: Object.freeze({ ...reason }), partial: Object.freeze({
      summary: work.partial.summary, evidenceRefs: this.copy(work.partial.evidenceRefs, 256),
      artifactRefs: this.copy(work.partial.artifactRefs, 256), unresolved: this.copy(work.partial.unresolved, 1024),
    }), pendingOperationRefs: this.copy(work.pendingOperationRefs, 256) });
  }
  private copy(values: readonly string[], bytes: number): readonly string[] {
    if (!Array.isArray(values) || values.length > 128) throw new BudgetAccountingError();
    for (const value of values) this.text(value, bytes);
    return Object.freeze([...values]);
  }
  private text(value: string, bytes: number): void {
    if (typeof value !== "string" || new TextEncoder().encode(value).byteLength > bytes || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new BudgetAccountingError();
  }
}
