import type { VerificationCheckResult } from "./VerificationCheckResult.js";
import type { IExecutionContext } from "./contracts/IExecutionContext.js";
export interface IVerificationReceiptVerifier { verify(receipt: VerificationCheckResult, context: IExecutionContext): Promise<boolean>; }
