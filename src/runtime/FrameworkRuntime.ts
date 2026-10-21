import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { RuntimeStartupOutcome } from "./RuntimeStartupOutcome.js";
import type { RuntimeShutdownOutcome } from "./RuntimeShutdownOutcome.js";
import { RuntimeStartupCoordinator } from "./RuntimeStartupCoordinator.js";
import { RuntimeShutdownCoordinator } from "./RuntimeShutdownCoordinator.js";
import { RuntimeAdmissionGate } from "./RuntimeAdmissionGate.js";
import { RuntimeExecutionRegistry } from "./RuntimeExecutionRegistry.js";
import { RuntimeAdmissionError } from "../errors/RuntimeAdmissionError.js";
export class FrameworkRuntime {
 private readonly startupAbort=new AbortController();private startup:Promise<RuntimeStartupOutcome>|null=null;private stopping:Promise<RuntimeShutdownOutcome>|null=null;private stopped:RuntimeShutdownOutcome|null=null;private sealed=false;private opened=false;
 constructor(private readonly startupCoordinator:RuntimeStartupCoordinator,private readonly shutdownCoordinator:RuntimeShutdownCoordinator,private readonly admission:RuntimeAdmissionGate,private readonly executions:RuntimeExecutionRegistry){}
 start():Promise<RuntimeStartupOutcome>{if(this.startup!==null)return this.startup;if(this.sealed)return Promise.reject(new RuntimeAdmissionError());this.startup=this.startupCoordinator.start(this.startupAbort.signal).then(async result=>{if(result.status==="ready"){if(this.sealed)return this.startupCoordinator.cancelReady();this.admission.open();this.opened=true;}return result;});return this.startup;}
 execute<T>(context:IExecutionContext,work:(context:IExecutionContext)=>Promise<T>):Promise<T>{this.admission.assertOpen();return this.executions.run(context,work);}
 shutdown():Promise<RuntimeShutdownOutcome>{if(this.stopped!==null)return Promise.resolve(this.stopped);if(this.stopping!==null)return this.stopping;this.sealed=true;this.admission.seal();this.startupAbort.abort();const attempt=(async()=>{if(this.startup!==null)await this.startup;const outcome=await (this.opened?this.shutdownCoordinator.shutdown():this.shutdownCoordinator.cleanupUnadmitted());if(outcome.status==="stopped")this.stopped=outcome;return outcome;})();this.stopping=attempt;return attempt.finally(()=>{if(this.stopping===attempt)this.stopping=null;});}
}
