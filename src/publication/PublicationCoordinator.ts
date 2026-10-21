import type { IPublicationStore } from "./IPublicationStore.js";
import type { ITrustedPublicationApprovalReader } from "./ITrustedPublicationApprovalReader.js";
import type { IPublicationEvidenceVerifier } from "./IPublicationEvidenceVerifier.js";
import type { IPublicationTarget } from "./IPublicationTarget.js";
import type { PublicationEvidenceRef } from "./PublicationEvidenceRef.js";
import type { PublicationOutcome } from "./PublicationOutcome.js";
import type { PublicationRecord } from "./PublicationRecord.js";
import type { PublicationEffectOutcome } from "./PublicationEffectOutcome.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import { PublicationRecordContract } from "./PublicationRecordContract.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { canonicalWorkflowValue as same } from "../workflows/canonicalWorkflowValue.js";
import { PublicationError } from "../errors/PublicationError.js";
export class PublicationCoordinator{
 constructor(private readonly store:IPublicationStore,private readonly approvals:ITrustedPublicationApprovalReader,private readonly evidence:IPublicationEvidenceVerifier,private readonly target:IPublicationTarget,private readonly records:PublicationRecordContract,private readonly clock:IClock){}
 async publish(id:string,approvalRef:string,evidence:PublicationEvidenceRef,context:IExecutionContext):Promise<PublicationOutcome>{
  const record=await this.load(id,context);if(record.command!==null)return this.present(record);const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);let stop=guard.check();if(stop!==null)return {status:"stopped",record,reason:stop,pendingOperationRefs:[]};if(typeof approvalRef!=="string"||approvalRef.length<1||approvalRef.length>256)return {status:"waiting-for-approval",code:"APPROVAL_REQUIRED",record};
  const approval=await this.approvals.read(approvalRef,record.proposal,context);stop=guard.check();if(stop!==null)return {status:"stopped",record,reason:stop,pendingOperationRefs:[]};if(approval===null||approval.decision!=="approved")return {status:"waiting-for-approval",code:"TRUSTED_APPROVAL_REQUIRED",record};
  const candidate=await this.records.validate({...record,revision:1,command:{operationId:context.identity.operationId,proposalDigest:record.proposal.digest,approvalRef,approval,evidence}});if(!candidate.valid||candidate.value.command===null)throw new PublicationError();const command=candidate.value.command;
  if(this.clock.nowEpochMs()>=command.approval.expiresAtEpochMs)return {status:"waiting-for-approval",code:"APPROVAL_EXPIRED",record};const verified=await this.evidence.verify(record.proposal,command.evidence,context);stop=guard.check();if(stop!==null)return {status:"stopped",record,reason:stop,pendingOperationRefs:[]};if(!verified)return {status:"blocked",code:"PROPOSAL_EVIDENCE_UNVERIFIED",record};if(this.clock.nowEpochMs()>=command.approval.expiresAtEpochMs)return {status:"waiting-for-approval",code:"APPROVAL_EXPIRED",record};
  const claim=await this.store.claim(id,command);if(!claim.claimed)return this.present(claim.record);const saved=claim.record.command!;stop=guard.check();if(stop!==null)return this.settle(claim.record,{status:"not-applied",code:"CONTROL_STOP"});let effect:PublicationEffectOutcome;try{effect=await this.target.apply(claim.record.proposal,saved,context);}catch{return this.present(claim.record);}return this.settle(claim.record,effect);
 }
 async reconcile(id:string,context:IExecutionContext):Promise<PublicationOutcome>{const record=await this.load(id,context);if(record.command===null||record.effect!==null)return this.present(record);const stop=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs).check();if(stop!==null)return {status:"stopped",record,reason:stop,pendingOperationRefs:[record.command.operationId]};const effect=await this.target.reconcile(record.proposal,record.command,context);return this.settle(record,effect);}
 private async settle(record:PublicationRecord,effect:PublicationEffectOutcome):Promise<PublicationOutcome>{if(effect.status==="unknown")return this.present(record);const checked=await this.records.validate({...record,revision:2,effect});if(!checked.valid||checked.value.effect===null)throw new PublicationError();return this.present(await this.store.finish(record.proposal.id,record.command!.operationId,checked.value.effect));}
 private async load(id:string,context:IExecutionContext):Promise<PublicationRecord>{if(same(context.scope)!==same(this.store.scope))throw new PublicationError();const record=await this.store.get(id);if(record===null)throw new PublicationError();return record;}
 private present(record:PublicationRecord):PublicationOutcome{if(record.effect!==null)return {status:"recorded",record};if(record.command!==null)return {status:"pending",record,pendingOperationRefs:[record.command.operationId]};return {status:"waiting-for-approval",code:"APPROVAL_REQUIRED",record};}
}
