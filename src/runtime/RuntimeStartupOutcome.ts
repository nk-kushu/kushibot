import type { RuntimeReleaseOutcome } from "./RuntimeReleaseOutcome.js";
export type RuntimeStartupOutcome=Readonly<{status:"ready";acquiredResourceIds:readonly string[]}>|Readonly<{status:"failed";code:"STARTUP_CONTROL_STOP"|"STARTUP_STEP_FAILED";stepId:string;cleanup:RuntimeReleaseOutcome}>;
