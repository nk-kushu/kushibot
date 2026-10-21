import type { IRuntimeResourceBinding } from "./IRuntimeResourceBinding.js";
import type { RuntimeControl } from "./RuntimeControl.js";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError.js";
export class BorrowedRuntimeResource<TResource extends object> implements IRuntimeResourceBinding {
 readonly dependencies:readonly string[]=Object.freeze([]);private attached=false;
 constructor(readonly id:string,private readonly handle:TResource){if(handle===null||(typeof handle!=="object"&&typeof handle!=="function"))throw new RuntimeLifecycleError();}
 isAcquired():boolean{return this.attached;}
 value():TResource{if(!this.attached)throw new RuntimeLifecycleError();return this.handle;}
 async acquire(_control:RuntimeControl):Promise<void>{this.attached=true;}
 async release(_control:RuntimeControl):Promise<void>{this.attached=false;}
}
