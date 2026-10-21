import type { AcceptedStepResult } from "./AcceptedStepResult.js";
export type WorkflowResult=Readonly<{runId:string;results:readonly AcceptedStepResult[]}>;
