import type { IAgentMemoryStore } from "./IAgentMemoryStore.js";
import type { IKnowledgeSourceReader } from "./IKnowledgeSourceReader.js";
import type { MemoryRecord } from "./MemoryRecord.js";
import type { MemoryRecallItem } from "./MemoryRecallItem.js";
import type { KnowledgeSourceObservation } from "./KnowledgeSourceObservation.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { canonicalWorkflowValue as canonical } from "../workflows/canonicalWorkflowValue.js";
import { AgentMemoryError } from "../errors/AgentMemoryError.js";
export class MemoryEvidenceVerifier {
 constructor(private readonly store:IAgentMemoryStore,private readonly sources:IKnowledgeSourceReader,private readonly json:JsonValueContract,private readonly clock:IClock){}
 async verify(record:MemoryRecord,context:IExecutionContext):Promise<MemoryRecallItem|null>{
  if(canonical(context.scope)!==canonical(this.store.scope)||canonical(record.proposal.scope)!==canonical(this.store.scope))throw new AgentMemoryError();const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs),p=record.proposal,d=record.decision;
  if(guard.check()!==null||d?.status!=="accepted"||record.invalidation!==null||this.clock.nowEpochMs()>=Math.min(p.expiresAtEpochMs,d.validUntilEpochMs))return null;
  const checked=await this.json.validate(await this.sources.read(p.source,context));if(!checked.valid)throw new AgentMemoryError();const observation=checked.value as unknown as KnowledgeSourceObservation;
  if(observation===null||typeof observation!=="object")throw new AgentMemoryError();if(observation.status!=="current"){if(!["unavailable","changed"].includes(observation.status)||Object.keys(observation).length!==1)throw new AgentMemoryError();return null;}
  if(Object.keys(observation).sort().join(",")!=="source,status,text,validUntilEpochMs,verificationRef"||typeof observation.text!=="string"||typeof observation.verificationRef!=="string"||observation.verificationRef.trim().length===0||observation.verificationRef.length>256||!Number.isSafeInteger(observation.validUntilEpochMs)||observation.validUntilEpochMs<0)throw new AgentMemoryError();
  if(canonical(observation.source)!==canonical(p.source)||observation.text!==p.statement)return null;
  const latest=await this.store.get(p.id),validUntilEpochMs=Math.min(p.expiresAtEpochMs,d.validUntilEpochMs,observation.validUntilEpochMs);
  if(guard.check()!==null||this.clock.nowEpochMs()>=validUntilEpochMs||latest===null||canonical(latest)!==canonical(record))return null;
  return Object.freeze({record,verificationRef:observation.verificationRef,validUntilEpochMs,fragment:Object.freeze({id:"memory:"+p.id,kind:"memory" as const,revisionRef:"memory-revision:"+record.revision,sourceRef:"memory:"+p.id,text:p.statement,priority:20})});
 }
}
