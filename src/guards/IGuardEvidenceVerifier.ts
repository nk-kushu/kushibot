import type { GuardCheckInput } from "./GuardCheckInput.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export interface IGuardEvidenceVerifier { verify(references: readonly string[], input: GuardCheckInput, context: IExecutionContext): Promise<boolean>; }
