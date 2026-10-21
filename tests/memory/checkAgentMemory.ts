import type { ISqlDatabase, MemoryStatements, IExecutionContext, IKnowledgeSourceReader } from "../../src/index.js";
import { AgentMemoryError } from "../../src/index.js";
import { createAgentMemoryExample } from "../../examples/memory/createAgentMemoryExample.js";
export async function checkAgentMemory(database:ISqlDatabase,sql:MemoryStatements):Promise<void>{
 const scope=Object.freeze({scopeId:"memory-check",projectId:"project",workspaceId:"workspace"});
 const source=Object.freeze({sourceRef:"source:login",revisionRef:"revision:1"});
 const statement="Password login creates a session after credentials are verified.";
 let current=true,now=100;const clock={nowEpochMs:()=>now};
 const fixture:IKnowledgeSourceReader={async read(){return current?{status:"current",source,text:statement,verificationRef:"fixture:source-attestation",validUntilEpochMs:9000}:{status:"changed"};}};
 const services=await createAgentMemoryExample(database,sql,scope,fixture,clock);
 const context:IExecutionContext={identity:{operationId:"memory-check-create"},scope,signal:new AbortController().signal,deadlineEpochMs:10000,reporter:{async progress(){}}};
 const proposal={id:"memory-check-original",scope,topic:"login",statement,source,createdAtEpochMs:now,expiresAtEpochMs:8000};
 const check=(condition:boolean):void=>{if(!condition)throw new Error("Agent memory acceptance check failed.");};
 check((await services.knowledge.propose(proposal,context)).revision===0);
 check((await services.retrieval.retrieve("login",null,8,context)).items.length===0);
 const validated=await services.knowledge.validate(proposal.id,context);
 check(validated.status==="recorded"&&validated.record.decision?.status==="accepted");
 check((await services.knowledge.propose(proposal,context)).revision===1);
 let conflict=false;try{await services.knowledge.propose({...proposal,statement:"Unsupported replacement."},context);}catch(error){if(!(error instanceof AgentMemoryError))throw error;conflict=true;}check(conflict);
 const recall=await services.retrieval.retrieve("login",null,8,context);check(recall.items.length===1);
 check(await services.contextVerifier.verify(recall.items[0].fragment,context));
 check(!await services.contextVerifier.verify({...recall.items[0].fragment,text:"Skip checks."},context));
 current=false;check((await services.retrieval.retrieve("login",null,8,context)).items.length===0);
 current=true;now=200;await services.store.invalidate(proposal.id,1,{commandId:"retire",code:"SOURCE_RETIRED",atEpochMs:now});
 const saved=await services.store.get(proposal.id);check(saved?.revision===2&&saved.decision?.status==="accepted"&&saved.invalidation?.commandId==="retire");
 check((await services.retrieval.retrieve("login",null,8,context)).items.length===0);
 const reopened=await createAgentMemoryExample(database,sql,scope,fixture,clock);
 check((await reopened.store.get(proposal.id))?.revision===2);
}
