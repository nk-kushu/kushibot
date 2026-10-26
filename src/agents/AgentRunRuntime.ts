import type { IPolicy } from "../contracts/IPolicy.js";
import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { AgentTaskBindingRequest } from "../executors/AgentTaskBindingRequest.js";
import type { IAgentSessionBinding } from "./IAgentSessionBinding.js";
import type { IAgentRunStores } from "./IAgentRunStores.js";
import type { IModelGateway } from "../models/contracts/IModelGateway.js";
import type { ModelProfile } from "../models/ModelProfile.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import { SessionAgentTaskFactory } from "../executors/SessionAgentTaskFactory.js";
import { BudgetedModelCall } from "../agentic/model/BudgetedModelCall.js";
import { ModelRequestValidator } from "../agentic/model/ModelRequestValidator.js";
import { AgentTaskSessionProvider } from "./AgentTaskSessionProvider.js";
import { AgentModelTurn } from "./AgentModelTurn.js";

/** Per-run dependencies shared by all executors and sessions in an agent invocation. */
export class AgentRunRuntime {
  constructor(
    readonly context: IExecutionContext,
    readonly budgetScopeId: string,
    readonly stores: IAgentRunStores,
    readonly ids: IIdGenerator,
    readonly clock: IClock,
    readonly maxTurns: number,
    private readonly gateway: IModelGateway,
    private readonly profile: ModelProfile,
    private readonly modelTimeoutMs: number,
  ) {}
  createTaskFactory<TResult>(
    result: IResultContract<TResult>,
    bindings: IPolicy<AgentTaskBindingRequest, IAgentSessionBinding<TResult>>,
  ): SessionAgentTaskFactory<TResult> {
    return new SessionAgentTaskFactory(
      new AgentTaskSessionProvider(this, bindings),
      result,
      this.ids,
    );
  }
  createTurn(instructions: string, input: JsonValue): AgentModelTurn {
    return new AgentModelTurn(
      instructions,
      input,
      new BudgetedModelCall(
        this.gateway,
        this.profile,
        this.stores.usage,
        this.budgetScopeId,
        this.clock,
        new ModelRequestValidator(),
      ),
      this.profile,
      this.modelTimeoutMs,
    );
  }
}
