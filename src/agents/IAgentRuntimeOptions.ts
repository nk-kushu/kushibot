import type { IClock } from "../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { IModelGateway } from "../models/contracts/IModelGateway.js";
import type { ModelProfile } from "../models/ModelProfile.js";
import type { UsageAmounts } from "../usage/UsageAmounts.js";
import type { IAgentRunStoreFactory } from "./IAgentRunStoreFactory.js";
import type { IScopedDebugRecorderFactory } from "../events/debug/IScopedDebugRecorderFactory.js";

export interface IAgentRuntimeOptions {
  readonly gateway: IModelGateway;
  readonly profile: ModelProfile;
  readonly stores?: IAgentRunStoreFactory;
  readonly clock?: IClock;
  readonly ids?: IIdGenerator;
  readonly scope?: ExecutionScopeRef;
  readonly maxTurns?: number;
  readonly timeoutMs?: number;
  readonly modelTimeoutMs?: number;
  readonly limits?: Partial<UsageAmounts>;
  /** Records debug events for each run: the run, workflow steps, model calls, tools and progress. */
  readonly debug?: IScopedDebugRecorderFactory;
}
