import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
import type { PartialProgress } from "../contracts/outcomes/PartialProgress.js";
import type { WorkflowResult } from "./WorkflowResult.js";
export type WorkflowEngineOutcome=Readonly<{status:"finished";outcome:ExecutionOutcome<WorkflowResult>}>|Readonly<{status:"pending";runId:string;partial:PartialProgress;pendingOperationRefs:readonly string[]}>|Readonly<{status:"busy";runId:string}>;
