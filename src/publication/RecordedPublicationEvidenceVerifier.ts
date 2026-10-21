import type { IPublicationEvidenceVerifier } from "./IPublicationEvidenceVerifier.js";
import type { IChangeProposalVerifier } from "./IChangeProposalVerifier.js";
import type { IReviewReportReader } from "./IReviewReportReader.js";
import type { IPublicationVerificationReader } from "./IPublicationVerificationReader.js";
import type { IVerificationReceiptVerifier } from "../executors/IVerificationReceiptVerifier.js";
import type { ChangeProposal } from "./ChangeProposal.js";
import type { PublicationEvidenceRef } from "./PublicationEvidenceRef.js";
import type { RegistrationRef } from "../contracts/RegistrationRef.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import { VerificationResultContract } from "../executors/VerificationResultContract.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { canonicalWorkflowValue as canonical } from "../workflows/canonicalWorkflowValue.js";
import { PublicationError } from "../errors/PublicationError.js";
export class RecordedPublicationEvidenceVerifier implements IPublicationEvidenceVerifier {
 private readonly policy:RegistrationRef;private readonly required:readonly RegistrationRef[];
 constructor(private readonly proposals:IChangeProposalVerifier,private readonly reviews:IReviewReportReader,private readonly results:IPublicationVerificationReader,private readonly receipts:IVerificationReceiptVerifier,private readonly checks:VerificationResultContract,private readonly json:JsonValueContract,policy:RegistrationRef,required:readonly RegistrationRef[]){if(!this.registration(policy)||required.length<1||required.length>16||required.some(r=>!this.registration(r))||new Set(required.map(r=>r.id)).size!==required.length)throw new PublicationError();this.policy=Object.freeze({...policy});this.required=Object.freeze(required.map(r=>Object.freeze({...r})));}
 async verify(proposal:ChangeProposal,evidence:PublicationEvidenceRef,context:IExecutionContext):Promise<boolean>{
  if(canonical(proposal.policy)!==canonical(this.policy)||!await this.proposals.verify(proposal,context))return false;
  const read=await this.reviews.read(evidence.reviewRef,context);if(read===null)return false;const normalized=await this.json.validate(read);if(!normalized.valid)return false;const report=normalized.value as unknown as typeof read;
  if(!this.keys(report,["proposalDigest","sourceSnapshotRef","policy","verdict","findings"])||report.proposalDigest!==proposal.digest||report.sourceSnapshotRef!==proposal.sourceSnapshotRef||canonical(report.policy)!==canonical(this.policy)||report.verdict!=="pass"||!Array.isArray(report.findings)||report.findings.length>32)return false;
  for(const f of report.findings)if(!this.keys(f,["code","blocking","message","sourceRefs"])||typeof f.code!=="string"||!/^[A-Z0-9_:-]{1,128}$/.test(f.code)||f.blocking!==false||typeof f.message!=="string"||f.message.trim().length===0||f.message.length>1024||!Array.isArray(f.sourceRefs)||f.sourceRefs.length<1||f.sourceRefs.length>16||f.sourceRefs.some((ref:unknown)=>typeof ref!=="string"||ref.length<1||ref.length>256))return false;
  const result=await this.results.read(evidence.verificationRef,context);if(result===null)return false;const checked=await this.checks.validate(result);if(!checked.valid||!checked.value.passed||checked.value.snapshotRef!==proposal.sourceSnapshotRef||checked.value.checks.length!==this.required.length)return false;
  for(const required of this.required){const matching=checked.value.checks.filter(c=>c.checkId===required.id&&c.checkVersion===required.version);if(matching.length!==1||matching[0].status!=="passed"||matching[0].snapshotRef!==proposal.sourceSnapshotRef||!await this.receipts.verify(matching[0],context))return false;}
  return this.proposals.verify(proposal,context);
 }
 private registration(v:RegistrationRef):boolean{return this.keys(v,["id","version"])&&[v.id,v.version].every(x=>typeof x==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(x));}
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));}
}
