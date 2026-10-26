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
}
