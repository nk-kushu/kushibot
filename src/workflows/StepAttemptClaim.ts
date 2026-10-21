import type { RegistrationRef } from "../contracts/RegistrationRef.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { StepDefinition } from "./StepDefinition.js";
import type { StepInputPolicyInput } from "./StepInputPolicyInput.js";
export type StepAttemptClaim=Readonly<{commandId:string;ownerToken:string;attemptId:string;operationId:string;stepRunId:string;runId:string;scope:ExecutionScopeRef;workflow:RegistrationRef;step:StepDefinition;view:StepInputPolicyInput;maxRunAttempts:number}>;
