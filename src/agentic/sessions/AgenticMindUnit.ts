import type { IExecutor } from "../../executors/contracts/IExecutor.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome.js";
import type { IAgenticSessionFactory } from "./IAgenticSessionFactory.js";
export class AgenticMindUnit<TResult> implements IExecutor<void, TResult> {
  constructor(private readonly sessions: IAgenticSessionFactory<TResult>) {}
  async execute(_input: void, context: IExecutionContext): Promise<ExecutionOutcome<TResult>> { return (await this.sessions.create(context)).execute(context); }
}
