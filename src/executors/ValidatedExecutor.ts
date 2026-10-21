import type { IExecutor } from "./contracts/IExecutor.js";
import type { IExecutionContext } from "./contracts/IExecutionContext.js";
import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { ExecutorContractError } from "../errors/ExecutorContractError.js";
export class ValidatedExecutor<TInput,TResult> implements IExecutor<TInput,TResult> {
  constructor(private readonly input: IResultContract<TInput>,
    private readonly outcomes: ExecutionOutcomeContract<TResult>,
    private readonly inner: IExecutor<TInput,TResult>,
    private readonly json: JsonValueContract,
    private readonly clock: IClock) {}
  async execute(raw: TInput, context: IExecutionContext): Promise<ExecutionOutcome<TResult>> {
    const guard = new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);
    const before = guard.check(); if (before !== null) return { status: "stopped", reason: before, partial: { summary: "", evidenceRefs: [], artifactRefs: [], unresolved: ["Executor did not start."] }, pendingOperationRefs: [] };
    const finite = await this.json.validate(raw);
    const checked = finite.valid && new TextEncoder().encode(JSON.stringify(finite.value)).byteLength <= 65536 ? await this.input.validate(finite.value) : finite;
    if (!checked.valid) return { status: "failed", error: { code: "EXECUTOR_INPUT_REJECTED", message: "Executor input failed validation." }, partial: { summary: "", evidenceRefs: [], artifactRefs: [], unresolved: ["Supply valid executor input."] }, pendingOperationRefs: [] };
    const immutable = await this.json.validate(checked.value); if (!immutable.valid ||
        new TextEncoder().encode(JSON.stringify(immutable.value)).byteLength > 65536) throw new ExecutorContractError();
    const after = guard.check(); if (after !== null) return { status: "stopped", reason: after, partial: { summary: "", evidenceRefs: [], artifactRefs: [], unresolved: ["Executor did not start."] }, pendingOperationRefs: [] };
    const outcome = await this.outcomes.validate(await this.inner.execute(immutable.value as unknown as TInput,context));
    if (!outcome.valid) throw new ExecutorContractError();
    return outcome.value;
  }
}
