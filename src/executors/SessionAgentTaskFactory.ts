import type { IAgentTaskFactory } from "./IAgentTaskFactory.js";
import type { IAgentTaskSessionProvider } from "./IAgentTaskSessionProvider.js";
import type { AgentTaskBindingRequest } from "./AgentTaskBindingRequest.js";
import type { AgentTaskBinding } from "./AgentTaskBinding.js";
import type { IExecutionContext } from "./contracts/IExecutionContext.js";
import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import { AgenticMindUnit } from "../agentic/sessions/AgenticMindUnit.js";
import { ExecutorContractError } from "../errors/ExecutorContractError.js";
import type { IScopedDebugRecorder } from "../events/debug/IScopedDebugRecorder.js";
export class SessionAgentTaskFactory<TResult> implements IAgentTaskFactory<TResult> {
  constructor(private readonly sessions: IAgentTaskSessionProvider<TResult>, private readonly result: IResultContract<TResult>, private readonly ids: IIdGenerator, private readonly debug?: IScopedDebugRecorder) {}
  async create(request: AgentTaskBindingRequest, context: IExecutionContext): Promise<AgentTaskBinding<TResult>> {
    const sessionId = this.ids.nextId(), operationId = this.ids.nextId();
    if (![sessionId,operationId].every(value => /^[A-Za-z0-9_.:-]{1,128}$/.test(value)) ||
        sessionId === operationId ||
        [sessionId,operationId].some(value => value === context.identity.sessionId ||
        value === context.identity.operationId)) throw new ExecutorContractError();
    const child: IExecutionContext = Object.freeze({ ...context, scope: Object.freeze({...context.scope}), identity: Object.freeze({ ...context.identity, sessionId, operationId, parentOperationId: context.identity.operationId }) });
    const factory = await this.sessions.create(request,this.result,child);
    return Object.freeze({ unit: new AgenticMindUnit(factory, this.debug), context: child });
  }
}
