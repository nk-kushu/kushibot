import type { PublicationEvidenceRef } from "./PublicationEvidenceRef.js";
import type { TrustedPublicationApproval } from "./TrustedPublicationApproval.js";
export type PublicationCommand=Readonly<{operationId:string;proposalDigest:string;approvalRef:string;approval:TrustedPublicationApproval;evidence:PublicationEvidenceRef}>;
