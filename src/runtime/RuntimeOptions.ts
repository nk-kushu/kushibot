import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
export type RuntimeOptions=Readonly<{runtimeId:string;scope:ExecutionScopeRef;startupTimeoutMs:number;drainTimeoutMs:number;shutdownTimeoutMs:number;maxActiveExecutions:number}>;
