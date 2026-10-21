import type { EditingResult } from "./EditingResult.js";
import { EditingResultContract } from "./EditingResultContract.js";

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
export class WorkspaceEditingExecutor implements IExecutor<TaskInput,EditingResult> {
  private readonly checked: ValidatedExecutor<TaskInput,EditingResult>;
  constructor(input: TaskInputContract, result: EditingResultContract, policy: IPolicy<TaskInput,AgentTaskAssignment>, factory: IAgentTaskFactory<EditingResult>, json: JsonValueContract, clock: IClock) {
    this.checked = new ValidatedExecutor(input,new ExecutionOutcomeContract(result,json),new AgentTaskExecutor("edit",policy,factory,clock),json,clock);
  }
  execute(input: TaskInput, context: IExecutionContext): Promise<ExecutionOutcome<EditingResult>> { return this.checked.execute(input,context); }
}
