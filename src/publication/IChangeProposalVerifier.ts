import type { ChangeProposal } from "./ChangeProposal.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export interface IChangeProposalVerifier {verify(proposal:ChangeProposal,context:IExecutionContext):Promise<boolean>;}
