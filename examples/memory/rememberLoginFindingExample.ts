import type { IExecutionContext, KnowledgeSourceRef } from "../../src/index.js";
import { MemoryKnowledgeService, MemoryRetrievalService } from "../../src/index.js";
export async function rememberLoginFindingExample(knowledge:MemoryKnowledgeService,retrieval:MemoryRetrievalService,source:KnowledgeSourceRef,createdAtEpochMs:number,proposalContext:IExecutionContext,validationContext:IExecutionContext,laterTaskContext:IExecutionContext){
 const record=await knowledge.propose({id:proposalContext.identity.operationId,scope:proposalContext.scope,topic:"login-session-behavior",statement:"Password login creates a session after credentials are verified.",source,createdAtEpochMs,expiresAtEpochMs:createdAtEpochMs+86400000},proposalContext);
 const validation=await knowledge.validate(record.proposal.id,validationContext);
 if(validation.status!=="recorded"||validation.record.decision?.status!=="accepted")return {validation,recall:null};
 const recall=await retrieval.retrieve("login-session-behavior",null,8,laterTaskContext);
 // The authorized context-snapshot owner may offer recall.items[].fragment as optional data.
 // Its normal snapshot verifier must call MemoryContextFragmentVerifier before dispatch.
 return {validation,recall};
}
