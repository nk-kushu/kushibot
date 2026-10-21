import type { VerificationReceipt } from "./VerificationReceipt.js";
import type { GuardTarget } from "../GuardTarget.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
export interface IVerificationReceiptReader { read(reference: string, target: GuardTarget, context: IExecutionContext): Promise<VerificationReceipt | null>; }
