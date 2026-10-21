import type { IExecutor } from "../../src/executors/contracts/IExecutor.js";
import type { IExecutionContext } from "../../src/executors/contracts/IExecutionContext.js";
import type { ExecutionOutcome } from "../../src/contracts/outcomes/ExecutionOutcome.js";

export class FakeExecutor<TInput, TResult> implements IExecutor<TInput, TResult> {
  private readonly received: Array<Readonly<{
    input: TInput;
    context: IExecutionContext;
  }>> = [];

  constructor(private readonly outcome: ExecutionOutcome<TResult>) {}

  async execute(
    input: TInput,
    context: IExecutionContext,
  ): Promise<ExecutionOutcome<TResult>> {
    this.received.push({ input, context });
    return this.outcome;
  }

  snapshot(): readonly Readonly<{
    input: TInput;
    context: IExecutionContext;
  }>[] {
    return [...this.received];
  }
}
