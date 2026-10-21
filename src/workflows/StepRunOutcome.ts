import type { StepAttemptReceipt } from "./StepAttemptReceipt.js";
export type StepRunOutcome=Readonly<{status:"recorded";receipt:StepAttemptReceipt}>|Readonly<{status:"pending";attemptId:string;pendingOperationRefs:readonly string[]}>|Readonly<{status:"blocked";code:string}>;
