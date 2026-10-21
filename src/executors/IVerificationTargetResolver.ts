import type { GuardTarget } from "../guards/GuardTarget.js";
import type { IExecutionContext } from "./contracts/IExecutionContext.js";
export interface IVerificationTargetResolver { resolve(snapshotRef: string, context: IExecutionContext): Promise<GuardTarget | null>; }
