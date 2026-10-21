import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot.js";
import type { StepInputPolicyInput } from "./StepInputPolicyInput.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export type StepContextEvidenceInput=Readonly<{run:WorkflowRunSnapshot;view:StepInputPolicyInput;execution:IExecutionContext}>;
