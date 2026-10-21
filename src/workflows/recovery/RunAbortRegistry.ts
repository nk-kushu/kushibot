import { ExecutionRecoveryError } from "../../errors/ExecutionRecoveryError.js";
export class RunAbortRegistry{
 private readonly controllers=new Map<string,Set<AbortController>>();
 register(runId:string,controller:AbortController):()=>void{if(!/^[A-Za-z0-9_.:-]{1,128}$/.test(runId))throw new ExecutionRecoveryError();const values=this.controllers.get(runId)??new Set<AbortController>();values.add(controller);this.controllers.set(runId,values);return ()=>{values.delete(controller);if(values.size===0)this.controllers.delete(runId);};}
 abort(runId:string):void{for(const controller of this.controllers.get(runId)??[])controller.abort();}
}
