import type { IAgentMemoryStore } from "./IAgentMemoryStore.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { MemoryRecallOutcome } from "./MemoryRecallOutcome.js";
import type { MemoryRecallItem } from "./MemoryRecallItem.js";
import { MemoryEvidenceVerifier } from "./MemoryEvidenceVerifier.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { canonicalWorkflowValue as canonical } from "../workflows/canonicalWorkflowValue.js";
import { AgentMemoryError } from "../errors/AgentMemoryError.js";
import type { IScopedDebugRecorder } from "../events/debug/IScopedDebugRecorder.js";
import { NoopDebugRecorder } from "../events/debug/NoopDebugRecorder.js";
export class MemoryRetrievalService {
 constructor(private readonly store:IAgentMemoryStore,private readonly evidence:MemoryEvidenceVerifier,private readonly clock:IClock,
  /** Reports which memories were recalled or skipped as stale; records nothing by default. */
  private readonly debug:IScopedDebugRecorder=new NoopDebugRecorder()){}
 async retrieve(topic:string,afterId:string|null,limit:number,context:IExecutionContext):Promise<MemoryRecallOutcome>{
  return this.debug.operation("memory.recall",async()=>{
   const outcome=await this.recall(topic,afterId,limit,context);
   this.debug.event("progress.reported",outcome.status==="ready"?"info":"warn",{
    operation:"memory.recalled",nextState:outcome.status,count:outcome.items.length,
    ...(outcome.reason?{code:outcome.reason.code.toUpperCase().replace(/[^A-Z0-9_]/g,"_")}:{}),
    relatedRefs:[`topic:${topic}`,...outcome.items.map(item=>`recalled:${item.record.proposal.id}`),...outcome.skipped.map(item=>`skipped:${item.memoryId}`)].slice(0,32).map(ref=>ref.slice(0,256)),
    metrics:{recalled:outcome.items.length,skipped:outcome.skipped.length,limit,more:outcome.nextAfterId===null?0:1},
   });
   return outcome;
  },{relatedRefs:[`topic:${topic}`.slice(0,256)]});
 }
 private async recall(topic:string,afterId:string|null,limit:number,context:IExecutionContext):Promise<MemoryRecallOutcome>{
  if(canonical(context.scope)!==canonical(this.store.scope))throw new AgentMemoryError();const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs),items:MemoryRecallItem[]=[],skipped:Readonly<{memoryId:string;code:"STALE_OR_UNSUPPORTED"}>[]=[];let cursor=afterId,reason=guard.check();
  if(reason!==null)return {status:"stopped",items:Object.freeze(items),nextAfterId:cursor,skipped:Object.freeze(skipped),reason};
  const records=await this.store.listAccepted(topic,afterId,limit);
  for(const record of records){reason=guard.check();if(reason!==null)return {status:"stopped",items:Object.freeze(items),nextAfterId:cursor,skipped:Object.freeze(skipped),reason};const item=await this.evidence.verify(record,context);reason=guard.check();if(reason!==null)return {status:"stopped",items:Object.freeze(items),nextAfterId:cursor,skipped:Object.freeze(skipped),reason};cursor=record.proposal.id;if(item===null)skipped.push({memoryId:cursor,code:"STALE_OR_UNSUPPORTED"});else items.push(item);}
  return {status:"ready",items:Object.freeze(items),nextAfterId:records.length===limit?cursor:null,skipped:Object.freeze(skipped),reason:null};
 }
}
