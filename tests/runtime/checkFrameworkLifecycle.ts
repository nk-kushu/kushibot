import type { RuntimeOptions, IExecutionContext, RuntimeShutdownSnapshot } from "../../src/index.js";
import { OwnedRuntimeResource, BorrowedRuntimeResource } from "../../src/index.js";
import { createFrameworkRuntimeExample } from "../../examples/runtime/createFrameworkRuntimeExample.js";
export async function checkFrameworkLifecycle():Promise<void>{
 const events:string[]=[],saved:RuntimeShutdownSnapshot[]=[],scope={scopeId:"fixture",projectId:"project",workspaceId:"workspace"},clock={nowEpochMs:()=>100};
 const options:RuntimeOptions={runtimeId:"runtime",scope,startupTimeoutMs:1000,drainTimeoutMs:1000,shutdownTimeoutMs:1000,maxActiveExecutions:4};
 const database=new OwnedRuntimeResource("database",[],{async acquire(){events.push("open-db");return {};},async release(){events.push("close-db");}});
 const journal=new OwnedRuntimeResource("journal",["database"],{async acquire(){database.value();events.push("open-journal");return {};},async release(){events.push("close-journal");}});
 let externalClosed=false;const external={close(){externalClosed=true;}},borrowed=new BorrowedRuntimeResource("borrowed-provider",external);
 const runtime=createFrameworkRuntimeExample(options,[journal,database,borrowed],[{id:"schemas",async initialize(){events.push("schemas");}}],[{id:"readiness",async verify(){return true;}}],[{id:"flush",async flush(){events.push("flush");}}],{async acquire(){return {scope,proofRef:"fixture:quiescence",pendingOperationRefs:[],async assertHeld(){return true;},async release(){events.push("release-barrier");}};}},{async save(snapshot){saved.push(snapshot);events.push("save-"+snapshot.stage);return "fixture:recovery-"+saved.length;}},clock);
 const check=(value:boolean):void=>{if(!value)throw new Error("Runtime lifecycle acceptance check failed.");};
 check(events.length===0);check((await runtime.start()).status==="ready");check(events.slice(0,3).join(",")==="open-db,open-journal,schemas");
 const context:IExecutionContext={identity:{operationId:"login",runId:"run"},scope,signal:new AbortController().signal,deadlineEpochMs:10000,reporter:{async progress(){}}};
 check(await runtime.execute(context,async()=>"collected-result")==="collected-result");
 const shutdown=await runtime.shutdown();check(shutdown.status==="stopped");check(!externalClosed);check(!database.isAcquired()&&!journal.isAcquired()&&!borrowed.isAcquired());
 check(events.indexOf("flush")<events.indexOf("save-quiescent"));check(events.indexOf("save-quiescent")<events.indexOf("close-journal"));check(events.indexOf("close-journal")<events.indexOf("close-db"));
 const count=events.length;check((await runtime.shutdown()).status==="stopped");check(events.length===count);check(saved.length===2&&saved[1].stage==="quiescent");
}
