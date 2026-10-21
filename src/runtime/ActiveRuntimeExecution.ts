import type { ExecutionIdentity } from "../contracts/runtime/ExecutionIdentity.js";
export type ActiveRuntimeExecution=Readonly<{identity:ExecutionIdentity;startedAtEpochMs:number}>;
