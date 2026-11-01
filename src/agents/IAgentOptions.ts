import type { IPolicy } from "../contracts/IPolicy.js";
import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { AgentRuntimeFactory } from "./AgentRuntimeFactory.js";
import type { IAgentWorkflow } from "./IAgentWorkflow.js";
import type { IAgentSetupInput } from "./IAgentSetupInput.js";

export interface IAgentOptions<TTask, TResult> {
  readonly id: string;
  readonly requestContract: IResultContract<TTask>;
  readonly workflow: IPolicy<IAgentSetupInput<TTask>, IAgentWorkflow<TResult>>;
  readonly runtime: AgentRuntimeFactory;
  /**
   * The run can wait for a human across processes. Its stored snapshot then has no absolute
   * deadline, because waiting time is not working time; each process still gets its own.
   */
  readonly suspendable?: boolean;
}
