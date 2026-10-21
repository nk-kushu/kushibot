import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { MemoryRecord } from "./MemoryRecord.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { MemoryProposalContract } from "./MemoryProposalContract.js";
export class MemoryRecordContract implements IResultContract<MemoryRecord> {
 readonly id="agent-memory-record";readonly version="1";
 constructor(private readonly json:JsonValueContract,private readonly proposals:MemoryProposalContract){}
 async validate(raw:unknown):Promise<ValidationResult<MemoryRecord>>{
  const checked=await this.json.validate(raw);if(!checked.valid)return checked;const r=checked.value as unknown as MemoryRecord;
  if(!this.keys(r,["schemaVersion","revision","proposal","decision","invalidation"])||r.schemaVersion!==1||!(await this.proposals.validate(r.proposal)).valid)return this.invalid();
  const d=r.decision,i=r.invalidation;
  if(d===null)return r.revision===0&&i===null?{valid:true,value:r}:this.invalid();
  if(d.status==="accepted"){
   if(!this.keys(d,["status","verificationRef","validatedAtEpochMs","validUntilEpochMs"])||!this.ref(d.verificationRef)||!this.time(d.validatedAtEpochMs)||!this.time(d.validUntilEpochMs)||d.validatedAtEpochMs<r.proposal.createdAtEpochMs||d.validUntilEpochMs<=d.validatedAtEpochMs||d.validUntilEpochMs>r.proposal.expiresAtEpochMs)return this.invalid();
  }else if(d.status!=="rejected"||!this.keys(d,["status","code","checkedAtEpochMs"])||!["SOURCE_UNAVAILABLE","SOURCE_CHANGED","STATEMENT_UNSUPPORTED","EXPIRED"].includes(d.code)||!this.time(d.checkedAtEpochMs)||d.checkedAtEpochMs<r.proposal.createdAtEpochMs)return this.invalid();
  if(i===null)return r.revision===1?{valid:true,value:r}:this.invalid();
  if(d.status!=="accepted"||r.revision!==2||!this.keys(i,["commandId","code","atEpochMs"])||typeof i.commandId!=="string"||!/^[A-Za-z0-9_.:-]{1,128}$/.test(i.commandId)||!["SOURCE_RETIRED","SUPERSEDED","USER_REVOKED"].includes(i.code)||!this.time(i.atEpochMs)||i.atEpochMs<d.validatedAtEpochMs)return this.invalid();
  return {valid:true,value:r};
 }
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(v,key));}
 private time(v:unknown):v is number{return Number.isSafeInteger(v)&&(v as number)>=0;}
 private ref(v:unknown):v is string{return typeof v==="string"&&v.trim().length>0&&v.length<=256;}
 private invalid():ValidationResult<MemoryRecord>{return {valid:false,issues:[{path:[],code:"MEMORY_RECORD_INVALID",message:"Invalid memory record lifecycle or evidence."}]};}
}
