import type { AgentTaskBindingRequest } from "./AgentTaskBindingRequest.js";
import type { AgentTaskBinding } from "./AgentTaskBinding.js";
import type { IExecutionContext } from "./contracts/IExecutionContext.js";
export interface IAgentTaskFactory<TResult> { create(request: AgentTaskBindingRequest, context: IExecutionContext): Promise<AgentTaskBinding<TResult>>; }
