import type { IResultContract } from "../contracts/validation/IResultContract.js";

import type { IExecutor } from "./contracts/IExecutor.js";
import type { IExecutionContext } from "./contracts/IExecutionContext.js";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
import type { IPolicy } from "../contracts/IPolicy.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { TaskInput } from "./TaskInput.js";
import type { AgentTaskAssignment } from "./AgentTaskAssignment.js";
import type { IAgentTaskFactory } from "./IAgentTaskFactory.js";
import { TaskInputContract } from "./TaskInputContract.js";
import { AgentTaskExecutor } from "./AgentTaskExecutor.js";
import { ValidatedExecutor } from "./ValidatedExecutor.js";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";

export type StructuredTaskExecutorOptions<TResult> = Readonly<{
  input: TaskInputContract;
  result: IResultContract<TResult>;
  policy: IPolicy<TaskInput, AgentTaskAssignment>;
  factory: IAgentTaskFactory<TResult>;
  json: JsonValueContract;
  clock: IClock;
}>;

export class StructuredTaskExecutor<TResult> implements IExecutor<TaskInput,TResult> {
  private readonly checked: ValidatedExecutor<TaskInput,TResult>;
  constructor({ input, result, policy, factory, json, clock }: StructuredTaskExecutorOptions<TResult>) {
    this.checked = new ValidatedExecutor(input,new ExecutionOutcomeContract(result,json),new AgentTaskExecutor("structured",policy,factory,clock),json,clock);
  }
  execute(input: TaskInput, context: IExecutionContext): Promise<ExecutionOutcome<TResult>> { return this.checked.execute(input,context); }
}
