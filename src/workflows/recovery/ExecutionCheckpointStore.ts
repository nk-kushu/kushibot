import type { IArtifactWriter } from "../../artifacts/IArtifactWriter.js";
import type { IArtifactReader } from "../../artifacts/IArtifactReader.js";
import type { IArtifactDigest } from "../../artifacts/IArtifactDigest.js";
import type { ArtifactRef } from "../../artifacts/ArtifactRef.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec.js";
import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot.js";
import type { UsageLedgerSnapshot } from "../../usage/UsageLedgerSnapshot.js";
import type { ExecutionCheckpointManifest } from "./ExecutionCheckpointManifest.js";
import { JsonValueContract } from "../../persistence/JsonValueContract.js";
import { canonicalWorkflowValue as same } from "../canonicalWorkflowValue.js";
import { ExecutionRecoveryError } from "../../errors/ExecutionRecoveryError.js";
export class ExecutionCheckpointStore{
 constructor(private readonly writer:IArtifactWriter,private readonly reader:IArtifactReader,private readonly digest:IArtifactDigest,private readonly json:JsonValueContract,private readonly runs:IRecordCodec<WorkflowRunSnapshot>,private readonly usages:IRecordCodec<UsageLedgerSnapshot>){}
 async save(run:WorkflowRunSnapshot,usage:UsageLedgerSnapshot,checkpointId:string,proofRef:string,participants:ExecutionCheckpointManifest["participants"],signal:AbortSignal):Promise<ArtifactRef>{
  const runRef=await this.write(await this.runs.encode(run),"workflow-run",signal),usageRef=await this.write(await this.usages.encode(usage),"usage-ledger",signal);
  const manifest:ExecutionCheckpointManifest={schemaVersion:1,checkpointId,runId:run.runId,scope:run.scope,runRevision:run.revision,proofRef,run:runRef,usage:usageRef,participants};await this.manifest(manifest);return this.write(JSON.stringify(manifest),"execution-checkpoint",signal);
 }
 async read(reference:ArtifactRef,scope:ExecutionScopeRef,signal:AbortSignal):Promise<Readonly<{manifest:ExecutionCheckpointManifest;run:WorkflowRunSnapshot;usage:UsageLedgerSnapshot}>>{
  const manifest=await this.manifest(JSON.parse(await this.text(reference,scope,signal)));const run=await this.runs.decode(await this.text(manifest.run,scope,signal)),usage=await this.usages.decode(await this.text(manifest.usage,scope,signal));if(same(manifest.scope)!==same(scope)||same(run.scope)!==same(scope)||run.runId!==manifest.runId||run.revision!==manifest.runRevision)throw new ExecutionRecoveryError();return {manifest,run,usage};
 }
 private async write(payload:string,kind:string,signal:AbortSignal):Promise<ArtifactRef>{const bytes=new TextEncoder().encode(payload);if(bytes.byteLength>2097152)throw new ExecutionRecoveryError();const hash=await this.digest.hash(bytes);return this.writer.write({name:kind,kind,mediaType:"application/json",schemaId:kind,schemaVersion:kind==="workflow-run"?"2":"1",sourceRefs:[],idempotencyKey:"checkpoint:"+hash,expiresAtEpochMs:null,data:bytes},signal);}
 private async text(ref:ArtifactRef,scope:ExecutionScopeRef,signal:AbortSignal):Promise<string>{if(!this.artifact(ref))throw new ExecutionRecoveryError();const value=await this.reader.read(ref,2097152,signal);if(same(value.metadata.scope)!==same(scope))throw new ExecutionRecoveryError();return new TextDecoder("utf-8",{fatal:true}).decode(value.data);}
 private async manifest(value:unknown):Promise<ExecutionCheckpointManifest>{const checked=await this.json.validate(value);if(!checked.valid)throw new ExecutionRecoveryError();const v=checked.value as unknown as ExecutionCheckpointManifest;if(!this.keys(v,["schemaVersion","checkpointId","runId","scope","runRevision","proofRef","run","usage","participants"])||v.schemaVersion!==1||![v.checkpointId,v.runId].every(id=>typeof id==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(id))||!Number.isSafeInteger(v.runRevision)||v.runRevision<0||!this.ref(v.proofRef)||v.scope===null||typeof v.scope!=="object"||!this.artifact(v.run)||!this.artifact(v.usage)||!Array.isArray(v.participants)||v.participants.length>16)throw new ExecutionRecoveryError();const ids=new Set<string>();for(const item of v.participants){if(!this.keys(item,["registration","reference"])||!this.keys(item.registration,["id","version"])||!this.ref(item.registration.id)||!this.ref(item.registration.version)||!this.artifact(item.reference)||ids.has(item.registration.id))throw new ExecutionRecoveryError();ids.add(item.registration.id);}return v;}
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(v,key));}
 private ref(v:unknown):v is string{return typeof v==="string"&&v.length>0&&v.length<=256;}
 private artifact(v:unknown):v is ArtifactRef{if(!this.keys(v,["artifactId","digest","byteLength","mediaType","schemaId","schemaVersion"]))return false;const r=v as ArtifactRef;return this.ref(r.artifactId)&&typeof r.digest==="string"&&/^[a-f0-9]{64}$/.test(r.digest)&&Number.isSafeInteger(r.byteLength)&&r.byteLength>=0&&this.ref(r.mediaType)&&(r.schemaId===null||this.ref(r.schemaId))&&(r.schemaVersion===null||this.ref(r.schemaVersion));}
}
