import type { IRuntimeRecoveryWriter } from "./IRuntimeRecoveryWriter.js";
import type { RuntimeShutdownSnapshot } from "./RuntimeShutdownSnapshot.js";
import type { RuntimeControl } from "./RuntimeControl.js";
import type { IArtifactWriter } from "../artifacts/IArtifactWriter.js";
import type { IArtifactDigest } from "../artifacts/IArtifactDigest.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import { RuntimeShutdownSnapshotContract } from "./RuntimeShutdownSnapshotContract.js";
import { RuntimeConfiguration } from "./RuntimeConfiguration.js";
import { canonicalWorkflowValue as same } from "../workflows/canonicalWorkflowValue.js";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError.js";
export class ArtifactRuntimeRecoveryWriter implements IRuntimeRecoveryWriter {
 constructor(private readonly config:RuntimeConfiguration,private readonly writer:IArtifactWriter,private readonly digest:IArtifactDigest,private readonly records:RuntimeShutdownSnapshotContract,private readonly clock:IClock){}
 async save(snapshot:RuntimeShutdownSnapshot,control:RuntimeControl):Promise<string>{if(control.signal.aborted||this.clock.nowEpochMs()>=control.deadlineEpochMs||snapshot.runtimeId!==this.config.options.runtimeId||same(snapshot.scope)!==same(this.config.options.scope)||snapshot.activeExecutions.length>64||snapshot.pendingOperationRefs.length>100||snapshot.retainedResourceIds.length>32)throw new RuntimeLifecycleError();const checked=await this.records.validate(snapshot);if(!checked.valid)throw new RuntimeLifecycleError();const bytes=new TextEncoder().encode(JSON.stringify(checked.value));if(bytes.byteLength>65536)throw new RuntimeLifecycleError();const hash=await this.digest.hash(bytes),ref=await this.writer.write({name:"runtime-shutdown",kind:"runtime-shutdown",mediaType:"application/json",schemaId:"runtime-shutdown",schemaVersion:"1",sourceRefs:[...snapshot.pendingOperationRefs],idempotencyKey:"runtime-shutdown:"+hash,expiresAtEpochMs:null,data:bytes},control.signal);return "artifact:"+ref.artifactId;}
}
