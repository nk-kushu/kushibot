import type { IGuardCheck } from "./IGuardCheck.js";
import type { GuardCheckInput } from "./GuardCheckInput.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { GuardConfigurationError } from "../errors/GuardConfigurationError.js";
export class BoundedGuardCheckRunner {
  private active = false;
  constructor(private readonly clock: IClock, private readonly timeoutMs: number) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647) throw new GuardConfigurationError();
  }
  async run(check: IGuardCheck, input: GuardCheckInput, context: IExecutionContext): Promise<Readonly<{ status: "returned"; value: unknown }> | Readonly<{ status: "unavailable" | "uncertain" }>> {
    if (this.active || new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs).check() !== null) return { status: "unavailable" };
    this.active = true; const abort = new AbortController(); let cancel = () => {}; let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const cancelled = new Promise<Readonly<{ status: "uncertain" }>>(resolve => { cancel = () => { abort.abort(); resolve({ status: "uncertain" }); }; context.signal.addEventListener("abort", cancel, { once: true }); });
      const remaining = context.deadlineEpochMs === null ? this.timeoutMs : Math.max(1, Math.min(this.timeoutMs, context.deadlineEpochMs - this.clock.nowEpochMs()));
      const timeout = new Promise<Readonly<{ status: "uncertain" }>>(resolve => { timer = setTimeout(() => { abort.abort(); resolve({ status: "uncertain" }); }, remaining); });
      const operation = Promise.resolve().then(() => check.evaluate(input, Object.freeze({ ...context, signal: abort.signal }))).then(
        value => ({ status: "returned" as const, value }), () => ({ status: "uncertain" as const }));
      void operation.then(() => { this.active = false; }, () => { this.active = false; });
      return await Promise.race([operation, cancelled, timeout]);
    } finally { if (timer !== undefined) clearTimeout(timer); context.signal.removeEventListener("abort", cancel); }
  }
}
