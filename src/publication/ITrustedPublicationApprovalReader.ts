import type { TrustedPublicationApproval } from "./TrustedPublicationApproval.js";
import type { ChangeProposal } from "./ChangeProposal.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export interface ITrustedPublicationApprovalReader {read(reference:string,proposal:ChangeProposal,context:IExecutionContext):Promise<TrustedPublicationApproval|null>;}
