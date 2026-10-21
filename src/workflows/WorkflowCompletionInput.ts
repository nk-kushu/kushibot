import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export type WorkflowCompletionInput=Readonly<{run:WorkflowRunSnapshot;execution:IExecutionContext}>;
