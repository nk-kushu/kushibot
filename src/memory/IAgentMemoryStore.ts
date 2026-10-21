import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { MemoryProposal } from "./MemoryProposal.js";
import type { MemoryRecord } from "./MemoryRecord.js";
import type { KnowledgeValidationDecision } from "./KnowledgeValidationDecision.js";
import type { MemoryInvalidation } from "./MemoryInvalidation.js";
export interface IAgentMemoryStore {
 readonly scope:ExecutionScopeRef;
 initialize():Promise<void>;
 propose(value:MemoryProposal):Promise<MemoryRecord>;
 get(id:string):Promise<MemoryRecord|null>;
 decide(id:string,expectedRevision:number,decision:KnowledgeValidationDecision):Promise<MemoryRecord>;
 invalidate(id:string,expectedRevision:number,invalidation:MemoryInvalidation):Promise<MemoryRecord>;
 listAccepted(topic:string,afterId:string|null,limit:number):Promise<readonly MemoryRecord[]>;
}
