import type { GuardTarget } from "./GuardTarget.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export interface IGuardTargetVerifier { verify(target: GuardTarget, context: IExecutionContext): Promise<boolean>; }
