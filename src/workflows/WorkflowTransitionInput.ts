import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot.js";
import type { StepAttemptReceipt } from "./StepAttemptReceipt.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export type WorkflowTransitionInput=Readonly<{run:WorkflowRunSnapshot;trigger:StepAttemptReceipt;execution:IExecutionContext}>;
