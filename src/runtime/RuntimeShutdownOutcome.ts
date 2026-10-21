import type { ActiveRuntimeExecution } from "./ActiveRuntimeExecution.js";
import type { RuntimeReleaseOutcome } from "./RuntimeReleaseOutcome.js";
export type RuntimeShutdownOutcome=Readonly<{status:"stopped";recoveryRef:string|null;pendingOperationRefs:readonly string[];cleanup:RuntimeReleaseOutcome}>|Readonly<{status:"blocked";code:string;activeExecutions:readonly ActiveRuntimeExecution[];pendingOperationRefs:readonly string[];retainedResourceIds:readonly string[];recoveryRef:string|null;cleanup:RuntimeReleaseOutcome|null}>;
