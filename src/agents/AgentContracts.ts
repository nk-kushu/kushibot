import type { IPolicy } from "../contracts/IPolicy.js";
import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { RegistrationRef } from "../contracts/RegistrationRef.js";
import type { IModelGateway } from "../models/contracts/IModelGateway.js";
import type { ModelProfile } from "../models/ModelProfile.js";
import type { IWorkflowRunStore } from "../workflows/IWorkflowRunStore.js";
import type { IUsageLedgerStore } from "../usage/IUsageLedgerStore.js";
import type { UsageAmounts } from "../usage/UsageAmounts.js";
import type { UsageLedgerSnapshot } from "../usage/UsageLedgerSnapshot.js";
import type { ISessionJournal } from "../agentic/sessions/ISessionJournal.js";
import type { WorkflowRunSnapshot } from "../workflows/WorkflowRunSnapshot.js";
import type { WorkflowEngineOutcome } from "../workflows/WorkflowEngineOutcome.js";
import type { WorkflowResult } from "../workflows/WorkflowResult.js";
import type { WorkflowDefinition } from "../workflows/WorkflowDefinition.js";
import type { ExecutorRegistry } from "../executors/ExecutorRegistry.js";
import type { StepPolicyRegistry } from "../workflows/StepPolicyRegistry.js";
import type { WorkflowPolicyRegistry } from "../workflows/WorkflowPolicyRegistry.js";
import type { StepContextEvidenceInput } from "../workflows/StepContextEvidenceInput.js";
import type { AgentRunRuntime } from "./AgentRunRuntime.js";
import type { AgentRuntimeFactory } from "./AgentRuntimeFactory.js";

export interface AgentRunOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: (message: string) => void | Promise<void>;
}

/** A fresh set per invocation; persistent implementations must isolate each run. */
export interface AgentRunStores {
  readonly workflow: IWorkflowRunStore;
  readonly usage: IUsageLedgerStore;
  readonly journal: ISessionJournal;
  readonly readJournal?: () => Promise<readonly unknown[]>;
}
export interface IAgentRunStoreFactory {
  create(run: Readonly<{ runId: string; scope: ExecutionScopeRef }>): Promise<AgentRunStores>;
}

export interface AgentRuntimeOptions {
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
}

/** Application behavior only. Infrastructure and engine wiring belong to Agent. */
export interface AgentWorkflow<TResult> {
  readonly definition: WorkflowDefinition;
  readonly executors: ExecutorRegistry;
  readonly policies: StepPolicyRegistry;
  readonly workflowPolicies: WorkflowPolicyRegistry;
  readonly completionPolicy: RegistrationRef;
  readonly evidence: IPolicy<StepContextEvidenceInput, boolean>;
  readonly resultPolicy: IPolicy<WorkflowResult, TResult>;
  readonly resultContract: IResultContract<TResult>;
  readonly artifacts?: () => Readonly<Record<string, JsonValue>>;
}
export interface AgentSetupInput<TTask> {
  readonly task: TTask;
  readonly runtime: AgentRunRuntime;
}
export interface AgentOptions<TTask, TResult> {
  readonly id: string;
  readonly requestContract: IResultContract<TTask>;
  readonly workflow: IPolicy<AgentSetupInput<TTask>, AgentWorkflow<TResult>>;
  readonly runtime: AgentRuntimeFactory;
}
export interface AgentRunResult<TResult> {
  readonly runId: string;
  readonly result: TResult | null;
  readonly outcome: WorkflowEngineOutcome;
  readonly snapshot: WorkflowRunSnapshot;
  readonly usage: UsageLedgerSnapshot;
  readonly journal: readonly unknown[];
  readonly artifacts: Readonly<Record<string, JsonValue>>;
}
