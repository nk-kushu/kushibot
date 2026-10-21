import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { IRecoveryLease } from "./IRecoveryLease.js";
export interface IRecoveryBarrier{acquire(run:WorkflowRunSnapshot,context:IExecutionContext):Promise<IRecoveryLease|null>;}
