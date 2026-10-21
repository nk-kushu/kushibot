import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome.js";
import type { IExecutionContext } from "./IExecutionContext.js";

/** Executes one assignment and returns an explicit outcome envelope. */
export interface IExecutor<TInput, TResult> {
  execute(
    input: TInput,
    context: IExecutionContext,
  ): Promise<ExecutionOutcome<TResult>>;
}
