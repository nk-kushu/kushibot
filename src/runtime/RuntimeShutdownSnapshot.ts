import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { ActiveRuntimeExecution } from "./ActiveRuntimeExecution.js";
export type RuntimeShutdownSnapshot=Readonly<{schemaVersion:1;runtimeId:string;scope:ExecutionScopeRef;stage:"draining"|"quiescent";activeExecutions:readonly ActiveRuntimeExecution[];pendingOperationRefs:readonly string[];proofRef:string|null;retainedResourceIds:readonly string[];atEpochMs:number}>;
