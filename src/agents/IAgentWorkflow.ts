import type { IPolicy } from "../contracts/IPolicy.js";
import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { RegistrationRef } from "../contracts/RegistrationRef.js";
import type { WorkflowResult } from "../workflows/WorkflowResult.js";
import type { WorkflowDefinition } from "../workflows/WorkflowDefinition.js";
import type { ExecutorRegistry } from "../executors/ExecutorRegistry.js";
import type { StepPolicyRegistry } from "../workflows/StepPolicyRegistry.js";
import type { WorkflowPolicyRegistry } from "../workflows/WorkflowPolicyRegistry.js";
import type { StepContextEvidenceInput } from "../workflows/StepContextEvidenceInput.js";

/** Application behavior only. Infrastructure and engine wiring belong to Agent. */
export interface IAgentWorkflow<TResult> {
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
