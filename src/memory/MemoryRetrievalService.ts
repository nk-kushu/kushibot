import type { IAgentMemoryStore } from "./IAgentMemoryStore.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { MemoryRecallOutcome } from "./MemoryRecallOutcome.js";
import type { MemoryRecallItem } from "./MemoryRecallItem.js";
import { MemoryEvidenceVerifier } from "./MemoryEvidenceVerifier.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { canonicalWorkflowValue as canonical } from "../workflows/canonicalWorkflowValue.js";
import { AgentMemoryError } from "../errors/AgentMemoryError.js";
export class MemoryRetrievalService {
 constructor(private readonly store:IAgentMemoryStore,private readonly evidence:MemoryEvidenceVerifier,private readonly clock:IClock){}
 async retrieve(topic:string,afterId:string|null,limit:number,context:IExecutionContext):Promise<MemoryRecallOutcome>{
  if(canonical(context.scope)!==canonical(this.store.scope))throw new AgentMemoryError();const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs),items:MemoryRecallItem[]=[],skipped:Readonly<{memoryId:string;code:"STALE_OR_UNSUPPORTED"}>[]=[];let cursor=afterId,reason=guard.check();
  if(reason!==null)return {status:"stopped",items:Object.freeze(items),nextAfterId:cursor,skipped:Object.freeze(skipped),reason};
  const records=await this.store.listAccepted(topic,afterId,limit);
  for(const record of records){reason=guard.check();if(reason!==null)return {status:"stopped",items:Object.freeze(items),nextAfterId:cursor,skipped:Object.freeze(skipped),reason};const item=await this.evidence.verify(record,context);reason=guard.check();if(reason!==null)return {status:"stopped",items:Object.freeze(items),nextAfterId:cursor,skipped:Object.freeze(skipped),reason};cursor=record.proposal.id;if(item===null)skipped.push({memoryId:cursor,code:"STALE_OR_UNSUPPORTED"});else items.push(item);}
  return {status:"ready",items:Object.freeze(items),nextAfterId:records.length===limit?cursor:null,skipped:Object.freeze(skipped),reason:null};
 }
}
