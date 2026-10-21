import type { AgentTaskBindingRequest } from "./AgentTaskBindingRequest.js";
import type { IExecutionContext } from "./contracts/IExecutionContext.js";
import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { IAgenticSessionFactory } from "../agentic/sessions/IAgenticSessionFactory.js";
export interface IAgentTaskSessionProvider<TResult> { create(request: AgentTaskBindingRequest, result: IResultContract<TResult>, context: IExecutionContext): Promise<IAgenticSessionFactory<TResult>>; }
