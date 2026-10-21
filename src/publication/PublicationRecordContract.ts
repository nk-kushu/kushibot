import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { PublicationRecord } from "./PublicationRecord.js";
import { ChangeProposalContract } from "./ChangeProposalContract.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { canonicalWorkflowValue as same } from "../workflows/canonicalWorkflowValue.js";
export class PublicationRecordContract implements IResultContract<PublicationRecord>{
 readonly id="publication-record";readonly version="1";
 constructor(private readonly json:JsonValueContract,private readonly proposals:ChangeProposalContract){}
 async validate(raw:unknown):Promise<ValidationResult<PublicationRecord>>{const checked=await this.json.validate(raw);if(!checked.valid)return checked;const r=checked.value as unknown as PublicationRecord;if(!this.keys(r,["schemaVersion","revision","proposal","command","effect"])||r.schemaVersion!==1||!(await this.proposals.validate(r.proposal)).valid)return this.invalid();if(r.command===null)return r.revision===0&&r.effect===null?{valid:true,value:r}:this.invalid();const c=r.command,a=c.approval,p=r.proposal;
  if(!this.keys(c,["operationId","proposalDigest","approvalRef","approval","evidence"])||!this.idValue(c.operationId)||c.proposalDigest!==p.digest||!this.ref(c.approvalRef)||!this.keys(c.evidence,["reviewRef","verificationRef"])||!this.ref(c.evidence.reviewRef)||!this.ref(c.evidence.verificationRef)||!this.keys(a,["approvalId","principalRef","receiptRef","decision","scope","proposalDigest","targetId","targetRevision","expiresAtEpochMs"])||!this.idValue(a.approvalId)||!this.ref(a.principalRef)||!this.ref(a.receiptRef)||a.decision!=="approved"||same(a.scope)!==same(p.scope)||a.proposalDigest!==p.digest||a.targetId!==p.targetId||a.targetRevision!==p.targetRevision||!Number.isSafeInteger(a.expiresAtEpochMs)||a.expiresAtEpochMs<0)return this.invalid();
  if(r.effect===null)return r.revision===1?{valid:true,value:r}:this.invalid();if(r.revision!==2)return this.invalid();const effect=r.effect;if(effect.status==="not-applied")return this.keys(effect,["status","code"])&&["TARGET_CHANGED","APPROVAL_INVALID","CONTROL_STOP","EVIDENCE_CHANGED"].includes(effect.code)?{valid:true,value:r}:this.invalid();
  if(effect.status!=="published"||!this.keys(effect,["status","receipt"]))return this.invalid();const receipt=effect.receipt;if(!this.keys(receipt,["operationId","proposalDigest","targetId","beforeRevision","afterRevision","receiptRef"])||receipt.operationId!==c.operationId||receipt.proposalDigest!==p.digest||receipt.targetId!==p.targetId||receipt.beforeRevision!==p.targetRevision||!this.ref(receipt.afterRevision)||receipt.afterRevision===receipt.beforeRevision||!this.ref(receipt.receiptRef))return this.invalid();return {valid:true,value:r};
 }
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));}
 private idValue(v:unknown):v is string{return typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);}
 private ref(v:unknown):v is string{return typeof v==="string"&&v.trim().length>0&&v.length<=256;}
 private invalid():ValidationResult<PublicationRecord>{return {valid:false,issues:[{path:[],code:"PUBLICATION_RECORD_INVALID",message:"Invalid publication binding or lifecycle."}]};}
}
