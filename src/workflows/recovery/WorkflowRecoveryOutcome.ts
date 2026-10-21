import type { WorkflowRecoveryRecord } from "./WorkflowRecoveryRecord.js";
export type WorkflowRecoveryOutcome=Readonly<{status:"recorded";record:WorkflowRecoveryRecord}>|Readonly<{status:"blocked";code:string;pendingOperationRefs:readonly string[]}>;
