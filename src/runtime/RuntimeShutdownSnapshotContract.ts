import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { RuntimeShutdownSnapshot } from "./RuntimeShutdownSnapshot.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class RuntimeShutdownSnapshotContract implements IResultContract<RuntimeShutdownSnapshot>{
 readonly id="runtime-shutdown";readonly version="1";
 constructor(private readonly json:JsonValueContract){}
 async validate(raw:unknown):Promise<ValidationResult<RuntimeShutdownSnapshot>>{const checked=await this.json.validate(raw);if(!checked.valid)return checked;const s=checked.value as unknown as RuntimeShutdownSnapshot;
  if(!this.keys(s,["schemaVersion","runtimeId","scope","stage","activeExecutions","pendingOperationRefs","proofRef","retainedResourceIds","atEpochMs"])||s.schemaVersion!==1||!this.idValue(s.runtimeId)||!this.scope(s.scope)||!["draining","quiescent"].includes(s.stage)||!this.time(s.atEpochMs)||!Array.isArray(s.activeExecutions)||s.activeExecutions.length>64||!this.refs(s.pendingOperationRefs,100)||!this.ids(s.retainedResourceIds,32))return this.invalid();
  if(s.stage==="quiescent"?(!this.ref(s.proofRef)||s.activeExecutions.length!==0):s.proofRef!==null)return this.invalid();
  const seen=new Set<string>();for(const e of s.activeExecutions){if(!this.keys(e,["identity","startedAtEpochMs"])||!this.time(e.startedAtEpochMs)||e.startedAtEpochMs>s.atEpochMs||e.identity===null||typeof e.identity!=="object"||!Object.keys(e.identity).every(k=>["operationId","runId","stepRunId","sessionId","parentOperationId"].includes(k))||!this.idValue(e.identity.operationId)||!Object.values(e.identity).every(v=>this.idValue(v))||seen.has(e.identity.operationId))return this.invalid();seen.add(e.identity.operationId);}
  if(new TextEncoder().encode(JSON.stringify(checked.value)).byteLength>65536)return this.invalid();return {valid:true,value:s};
 }
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));}
 private idValue(v:unknown):v is string{return typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);}
 private ref(v:unknown):v is string{return typeof v==="string"&&v.trim().length>0&&v.length<=256;}
 private ids(v:unknown,max:number):boolean{return Array.isArray(v)&&v.length<=max&&v.every(x=>this.idValue(x))&&new Set(v).size===v.length;}
 private refs(v:unknown,max:number):boolean{return Array.isArray(v)&&v.length<=max&&v.every(x=>this.ref(x))&&new Set(v).size===v.length;}
 private time(v:unknown):v is number{return Number.isSafeInteger(v)&&(v as number)>=0;}
 private scope(v:unknown):boolean{if(v===null||typeof v!=="object")return false;const s=v as Record<string,unknown>;return this.keys(s,s.workspaceId===undefined?["scopeId","projectId"]:["scopeId","projectId","workspaceId"])&&this.idValue(s.scopeId)&&this.idValue(s.projectId)&&(s.workspaceId===undefined||this.idValue(s.workspaceId));}
 private invalid():ValidationResult<RuntimeShutdownSnapshot>{return {valid:false,issues:[{path:[],code:"RUNTIME_SHUTDOWN_SNAPSHOT_INVALID",message:"Invalid bounded shutdown snapshot."}]};}
}
