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
import { DebugRecordingModelGateway } from "./DebugRecordingModelGateway.js";
import type { IScopedDebugRecorder } from "../events/debug/IScopedDebugRecorder.js";
import { NoopDebugRecorder } from "../events/debug/NoopDebugRecorder.js";

/** Replaces the run's model for one session; every model shares the run's budget. */
export type AgentModelBinding = Readonly<{
  gateway: IModelGateway;
  profile: ModelProfile;
}>;

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
    /** This run's debug events; records nothing unless the host configured `debug`. */
    readonly debug: IScopedDebugRecorder = new NoopDebugRecorder(),
  ) {}
  createTaskFactory<TResult>(
    result: IResultContract<TResult>,
    bindings: IPolicy<AgentTaskBindingRequest, IAgentSessionBinding<TResult>>,
    model?: AgentModelBinding,
  ): SessionAgentTaskFactory<TResult> {
    return new SessionAgentTaskFactory(
      new AgentTaskSessionProvider(this, bindings, model),
      result,
      this.ids,
      this.debug,
    );
  }
  createTurn(instructions: string, input: JsonValue, model?: AgentModelBinding): AgentModelTurn {
    return new AgentModelTurn(
      instructions,
      input,
      this.createModelCall(model),
      model?.profile ?? this.profile,
      this.modelTimeoutMs,
      this.debug,
    );
  }
  /** A model call charged to this run, for work outside a session such as scheduling. */
  createModelCall(model?: AgentModelBinding): BudgetedModelCall {
    return new BudgetedModelCall(
      new DebugRecordingModelGateway(model?.gateway ?? this.gateway, this.debug),
      model?.profile ?? this.profile,
      this.stores.usage,
      this.budgetScopeId,
      this.clock,
      new ModelRequestValidator(),
    );
  }
  /** What `createModelCall` needs alongside it to size and bound a request. */
  modelLimits(model?: AgentModelBinding): Readonly<{ profile: ModelProfile; timeoutMs: number }> {
    return { profile: model?.profile ?? this.profile, timeoutMs: this.modelTimeoutMs };
  }
}
