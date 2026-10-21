import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
export interface IRuntimeQuiescenceLease {readonly scope:ExecutionScopeRef;readonly proofRef:string;readonly pendingOperationRefs:readonly string[];assertHeld():Promise<boolean>;release():Promise<void>;}
