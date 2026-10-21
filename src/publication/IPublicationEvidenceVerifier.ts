import type { ChangeProposal } from "./ChangeProposal.js";
import type { PublicationEvidenceRef } from "./PublicationEvidenceRef.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export interface IPublicationEvidenceVerifier {verify(proposal:ChangeProposal,evidence:PublicationEvidenceRef,context:IExecutionContext):Promise<boolean>;}
