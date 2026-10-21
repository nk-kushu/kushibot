import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
export interface IRecoveryLease{readonly runId:string;readonly scope:ExecutionScopeRef;readonly previousOwnerToken:string|null;readonly proofRef:string;assertHeld():Promise<boolean>;release():Promise<void>;}
