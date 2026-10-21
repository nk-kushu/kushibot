import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { MemoryProposal } from "./MemoryProposal.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class MemoryProposalContract implements IResultContract<MemoryProposal> {
 readonly id="memory-proposal";readonly version="1";
 constructor(private readonly json:JsonValueContract){}
 async validate(value:unknown):Promise<ValidationResult<MemoryProposal>>{
  const checked=await this.json.validate(value);if(!checked.valid)return checked;
  const p=checked.value as unknown as MemoryProposal;
  if(!this.keys(p,["id","scope","topic","statement","source","createdAtEpochMs","expiresAtEpochMs"])||!this.idValue(p.id)||!this.idValue(p.topic)||!this.scope(p.scope)||!this.keys(p.source,["sourceRef","revisionRef"])||!this.text(p.source.sourceRef,256)||!this.text(p.source.revisionRef,256)||!this.text(p.statement,8192)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(p.statement)||/[\uD800-\uDFFF]/u.test(p.statement)||new TextEncoder().encode(p.statement).byteLength>8192||!this.time(p.createdAtEpochMs)||!this.time(p.expiresAtEpochMs)||p.expiresAtEpochMs<=p.createdAtEpochMs||p.expiresAtEpochMs-p.createdAtEpochMs>2592000000)return {valid:false,issues:[{path:[],code:"MEMORY_PROPOSAL_INVALID",message:"Expected a bounded scoped proposal with source and expiry."}]};
  return {valid:true,value:p};
 }
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(v,key));}
 private idValue(v:unknown):v is string{return typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);}
 private text(v:unknown,max:number):v is string{return typeof v==="string"&&v.trim().length>0&&v.length<=max;}
 private time(v:unknown):v is number{return Number.isSafeInteger(v)&&(v as number)>=0;}
 private scope(v:unknown):boolean{if(v===null||typeof v!=="object")return false;const s=v as Record<string,unknown>;return this.keys(s,s.workspaceId===undefined?["scopeId","projectId"]:["scopeId","projectId","workspaceId"])&&this.idValue(s.scopeId)&&this.idValue(s.projectId)&&(s.workspaceId===undefined||this.idValue(s.workspaceId));}
}
