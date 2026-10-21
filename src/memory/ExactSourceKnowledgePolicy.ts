import type { IPolicy } from "../contracts/IPolicy.js";
import type { KnowledgeValidationInput } from "./KnowledgeValidationInput.js";
import type { KnowledgeValidationDecision } from "./KnowledgeValidationDecision.js";
export class ExactSourceKnowledgePolicy implements IPolicy<KnowledgeValidationInput,KnowledgeValidationDecision> {
 async apply(input:KnowledgeValidationInput):Promise<KnowledgeValidationDecision>{
  const {proposal,observation,nowEpochMs}=input;
  if(nowEpochMs>=proposal.expiresAtEpochMs)return {status:"rejected",code:"EXPIRED",checkedAtEpochMs:nowEpochMs};
  if(observation.status==="unavailable")return {status:"rejected",code:"SOURCE_UNAVAILABLE",checkedAtEpochMs:nowEpochMs};
  if(observation.status==="changed")return {status:"rejected",code:"SOURCE_CHANGED",checkedAtEpochMs:nowEpochMs};
  if(observation.source.sourceRef!==proposal.source.sourceRef||observation.source.revisionRef!==proposal.source.revisionRef)return {status:"rejected",code:"SOURCE_CHANGED",checkedAtEpochMs:nowEpochMs};
  if(nowEpochMs>=observation.validUntilEpochMs)return {status:"rejected",code:"EXPIRED",checkedAtEpochMs:nowEpochMs};
  if(observation.text!==proposal.statement)return {status:"rejected",code:"STATEMENT_UNSUPPORTED",checkedAtEpochMs:nowEpochMs};
  return {status:"accepted",verificationRef:observation.verificationRef,validatedAtEpochMs:nowEpochMs,validUntilEpochMs:Math.min(proposal.expiresAtEpochMs,observation.validUntilEpochMs)};
 }
}
