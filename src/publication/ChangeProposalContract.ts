import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { ChangeProposal } from "./ChangeProposal.js";
import type { ArtifactRef } from "../artifacts/ArtifactRef.js";
import type { IArtifactDigest } from "../artifacts/IArtifactDigest.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class ChangeProposalContract implements IResultContract<ChangeProposal>{
 readonly id="change-proposal";readonly version="1";
 constructor(private readonly json:JsonValueContract,private readonly digest:IArtifactDigest){}
 async validate(raw:unknown):Promise<ValidationResult<ChangeProposal>>{const checked=await this.json.validate(raw);if(!checked.valid)return checked;const p=checked.value as unknown as ChangeProposal;
  if(!this.keys(p,["id","scope","summary","sourceSnapshotRef","targetId","targetRevision","policy","changes","digest"])||!this.idValue(p.id)||!this.scope(p.scope)||!this.ref(p.summary,1024)||!this.ref(p.sourceSnapshotRef)||!this.idValue(p.targetId)||!this.ref(p.targetRevision)||!this.keys(p.policy,["id","version"])||!this.idValue(p.policy.id)||!this.idValue(p.policy.version)||!this.hash(p.digest)||!Array.isArray(p.changes)||p.changes.length<1||p.changes.length>32)return this.invalid();
  const paths=new Set<string>();let bytes=0;for(const c of p.changes){if(!this.keys(c,["path","beforeDigest","after"])||!this.path(c.path)||paths.has(c.path)||!(c.beforeDigest===null||this.hash(c.beforeDigest))||!(c.after===null||this.artifact(c.after))||c.beforeDigest===null&&c.after===null)return this.invalid();paths.add(c.path);bytes+=c.after?.byteLength??0;if(bytes>8388608)return this.invalid();}
  const {digest,...body}=p,normalized=await this.json.validate(body);if(!normalized.valid||await this.digest.hash(new TextEncoder().encode(JSON.stringify(normalized.value)))!==digest)return this.invalid();return {valid:true,value:p};
 }
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));}
 private ref(v:unknown,max=256):v is string{return typeof v==="string"&&v.trim().length>0&&v.length<=max;}
 private idValue(v:unknown):v is string{return typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);}
 private hash(v:unknown):v is string{return typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);}
 private scope(v:unknown):boolean{if(v===null||typeof v!=="object")return false;const s=v as Record<string,unknown>;return this.keys(s,s.workspaceId===undefined?["scopeId","projectId"]:["scopeId","projectId","workspaceId"])&&this.idValue(s.scopeId)&&this.idValue(s.projectId)&&(s.workspaceId===undefined||this.idValue(s.workspaceId));}
 private path(v:unknown):v is string{return typeof v==="string"&&v.length>0&&v.length<=240&&!/[\\\u0000-\u001f:]/.test(v)&&!v.startsWith("/")&&v.split("/").every(part=>part!==""&&part!=="."&&part!==".."&&part!==".git");}
 private artifact(v:ArtifactRef):boolean{return this.keys(v,["artifactId","digest","byteLength","mediaType","schemaId","schemaVersion"])&&this.idValue(v.artifactId)&&this.hash(v.digest)&&Number.isSafeInteger(v.byteLength)&&v.byteLength>=0&&v.byteLength<=8388608&&this.ref(v.mediaType)&&(v.schemaId===null||this.ref(v.schemaId))&&(v.schemaVersion===null||this.ref(v.schemaVersion));}
 private invalid():ValidationResult<ChangeProposal>{return {valid:false,issues:[{path:[],code:"CHANGE_PROPOSAL_INVALID",message:"Invalid exact change proposal."}]};}
}
