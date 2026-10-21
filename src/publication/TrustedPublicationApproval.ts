import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
export type TrustedPublicationApproval=Readonly<{approvalId:string;principalRef:string;receiptRef:string;decision:"approved"|"denied";scope:ExecutionScopeRef;proposalDigest:string;targetId:string;targetRevision:string;expiresAtEpochMs:number}>;
