import type { StepRunOutcome } from "./StepRunOutcome.js";
export type StepAttemptClaimOutcome=Readonly<{status:"admitted";attemptNumber:number}>|Readonly<{status:"existing";outcome:StepRunOutcome}>|Readonly<{status:"blocked";code:string}>;
