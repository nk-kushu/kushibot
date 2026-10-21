import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { ActiveRuntimeExecution } from "./ActiveRuntimeExecution.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import { RuntimeConfiguration } from "./RuntimeConfiguration.js";
import { canonicalWorkflowValue as same } from "../workflows/canonicalWorkflowValue.js";
import { RuntimeAdmissionError } from "../errors/RuntimeAdmissionError.js";
export class RuntimeExecutionRegistry {
 private readonly active=new Map<string,Readonly<{record:ActiveRuntimeExecution;controller:AbortController}>>();private readonly waiters=new Set<()=>void>();
 constructor(private readonly config:RuntimeConfiguration,private readonly clock:IClock){}
 snapshot():readonly ActiveRuntimeExecution[]{return Object.freeze([...this.active.values()].map(v=>v.record));}
 async run<T>(context:IExecutionContext,work:(context:IExecutionContext)=>Promise<T>):Promise<T>{const id=context.identity.operationId;if(!this.identity(context.identity)||same(context.scope)!==same(this.config.options.scope)||this.active.has(id)||this.active.size>=this.config.options.maxActiveExecutions)throw new RuntimeAdmissionError();const controller=new AbortController(),onAbort=()=>controller.abort();context.signal.addEventListener("abort",onAbort,{once:true});if(context.signal.aborted)controller.abort();const now=this.clock.nowEpochMs();if(!Number.isSafeInteger(now)||now<0){context.signal.removeEventListener("abort",onAbort);throw new RuntimeAdmissionError();}const identity=Object.freeze({...context.identity}),record=Object.freeze({identity,startedAtEpochMs:now});this.active.set(id,{record,controller});try{return await work(Object.freeze({...context,identity,scope:this.config.options.scope,signal:controller.signal}));}finally{context.signal.removeEventListener("abort",onAbort);this.active.delete(id);if(this.active.size===0)for(const notify of [...this.waiters])notify();}}
 private identity(value:Readonly<Record<string,unknown>>):boolean{return value!==null&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).every(key=>["operationId","runId","stepRunId","sessionId","parentOperationId"].includes(key))&&typeof value.operationId==="string"&&Object.values(value).every(v=>typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v));}
 requestAbort():void{for(const value of this.active.values())value.controller.abort();}
 waitForIdle(signal:AbortSignal):Promise<boolean>{if(this.active.size===0)return Promise.resolve(true);if(signal.aborted)return Promise.resolve(false);return new Promise(resolve=>{const finish=(idle:boolean)=>{this.waiters.delete(onIdle);signal.removeEventListener("abort",onAbort);resolve(idle);},onIdle=()=>finish(true),onAbort=()=>finish(false);this.waiters.add(onIdle);signal.addEventListener("abort",onAbort,{once:true});if(this.active.size===0)finish(true);else if(signal.aborted)finish(false);});}
}
