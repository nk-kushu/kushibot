import type { IClock } from "../contracts/runtime/IClock.js";
import type { RuntimeControl } from "./RuntimeControl.js";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError.js";
export class RuntimeControlScope {
 readonly control:RuntimeControl;private readonly controller=new AbortController();private timer:ReturnType<typeof setTimeout>|null=null;private parent:AbortSignal|undefined;private listener:(()=>void)|undefined;
 private constructor(deadline:number){this.control=Object.freeze({signal:this.controller.signal,deadlineEpochMs:deadline});}
 static open(clock:IClock,timeoutMs:number,parent?:AbortSignal):RuntimeControlScope{const now=clock.nowEpochMs(),deadline=now+timeoutMs;if(!Number.isSafeInteger(now)||now<0||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000||!Number.isSafeInteger(deadline))throw new RuntimeLifecycleError();const scope=new RuntimeControlScope(deadline);scope.timer=setTimeout(()=>{scope.controller.abort();},timeoutMs);if(parent!==undefined){scope.parent=parent;scope.listener=()=>scope.controller.abort();parent.addEventListener("abort",scope.listener,{once:true});if(parent.aborted)scope.controller.abort();}return scope;}
 cancel():void{this.controller.abort();}
 dispose():void{if(this.timer!==null){clearTimeout(this.timer);this.timer=null;}if(this.parent!==undefined&&this.listener!==undefined)this.parent.removeEventListener("abort",this.listener);this.parent=undefined;this.listener=undefined;}
}
