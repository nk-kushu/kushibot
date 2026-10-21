import type { StepInputPolicyInput } from "./StepInputPolicyInput.js";
import type { WorkflowDefinition } from "./WorkflowDefinition.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export interface IStepContextVerifier { verify(view:StepInputPolicyInput,definition:WorkflowDefinition,context:IExecutionContext):Promise<boolean>; }
