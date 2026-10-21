import type { IArtifactWriter } from "../../artifacts/IArtifactWriter.js";
import type { IArtifactDigest } from "../../artifacts/IArtifactDigest.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import { JsonValueContract } from "../../persistence/JsonValueContract.js";
import { ExecutionRecoveryError } from "../../errors/ExecutionRecoveryError.js";
export class RecoveryEvidenceStore{
 constructor(private readonly writer:IArtifactWriter,private readonly digest:IArtifactDigest,private readonly json:JsonValueContract){}
 async save(runId:string,operationRef:string,value:unknown,evidenceRefs:readonly string[],signal:AbortSignal):Promise<string>{if(evidenceRefs.length<1||evidenceRefs.length>16||evidenceRefs.some(ref=>typeof ref!=="string"||!ref||ref.length>256))throw new ExecutionRecoveryError();const checked=await this.json.validate({schemaVersion:1,runId,operationRef,value,evidenceRefs:[...new Set(evidenceRefs)].sort()});if(!checked.valid)throw new ExecutionRecoveryError();const bytes=new TextEncoder().encode(JSON.stringify(checked.value));if(bytes.byteLength>65536)throw new ExecutionRecoveryError();const digest=await this.digest.hash(bytes);const ref=await this.writer.write({name:"recovery-evidence",kind:"recovery-evidence",mediaType:"application/json",schemaId:"recovery-evidence",schemaVersion:"1",sourceRefs:[...evidenceRefs],idempotencyKey:"recovery-evidence:"+digest,expiresAtEpochMs:null,data:bytes},signal);return "artifact:"+ref.artifactId;}
}
