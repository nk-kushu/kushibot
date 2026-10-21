import type { VerificationResult } from "../executors/VerificationResult.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export interface IPublicationVerificationReader {read(reference:string,context:IExecutionContext):Promise<VerificationResult|null>;}
