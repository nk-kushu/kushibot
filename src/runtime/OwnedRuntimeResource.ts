import type { IRuntimeResourceBinding } from "./IRuntimeResourceBinding.js";
import type { IRuntimeResourceFactory } from "./IRuntimeResourceFactory.js";
import type { RuntimeControl } from "./RuntimeControl.js";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError.js";
export class OwnedRuntimeResource<TResource extends object> implements IRuntimeResourceBinding {
 readonly dependencies:readonly string[];private handle:TResource|undefined;private attempted=false;private releasing:Promise<void>|null=null;
 constructor(readonly id:string,dependencies:readonly string[],private readonly factory:IRuntimeResourceFactory<TResource>){this.dependencies=Object.freeze([...dependencies]);}
 isAcquired():boolean{return this.handle!==undefined;}
 value():TResource{if(this.handle===undefined)throw new RuntimeLifecycleError();return this.handle;}
 async acquire(control:RuntimeControl):Promise<void>{if(this.handle!==undefined)return;if(this.attempted)throw new RuntimeLifecycleError();this.attempted=true;const handle=await this.factory.acquire(control);if(handle===null||(typeof handle!=="object"&&typeof handle!=="function"))throw new RuntimeLifecycleError();this.handle=handle;}
 release(control:RuntimeControl):Promise<void>{if(this.handle===undefined)return Promise.resolve();if(this.releasing!==null)return this.releasing;const handle=this.handle;this.releasing=(async()=>{await this.factory.release(handle,control);this.handle=undefined;})();const task=this.releasing;return task.finally(()=>{if(this.releasing===task)this.releasing=null;});}
}
