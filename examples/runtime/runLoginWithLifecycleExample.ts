import type { IExecutionContext, WorkflowEngineOutcome } from "../../src/index.js";
import { FrameworkRuntime, WorkflowEngine } from "../../src/index.js";
export async function runLoginWithLifecycleExample(runtime:FrameworkRuntime,engine:WorkflowEngine,context:IExecutionContext){
 const startup=await runtime.start();
 if(startup.status!=="ready")return {startup,work:null,shutdown:await runtime.shutdown()};
 let work:WorkflowEngineOutcome|null=null,workErrorCode:string|null=null;
 try{work=await runtime.execute(context,ownedContext=>engine.run(ownedContext));}catch{workErrorCode="HOST_WORK_FAILED";}
 try{return {startup,work,workErrorCode,shutdown:await runtime.shutdown(),shutdownErrorCode:null};}
 catch{return {startup,work,workErrorCode,shutdown:null,shutdownErrorCode:"SHUTDOWN_ADAPTER_FAILED"};}
}
