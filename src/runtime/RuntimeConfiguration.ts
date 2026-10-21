import type { RuntimeOptions } from "./RuntimeOptions.js";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError.js";
export class RuntimeConfiguration {
 readonly options:RuntimeOptions;
 constructor(value:RuntimeOptions){if(!this.keys(value,["runtimeId","scope","startupTimeoutMs","drainTimeoutMs","shutdownTimeoutMs","maxActiveExecutions"])||!this.id(value.runtimeId)||!this.keys(value.scope,value.scope?.workspaceId===undefined?["scopeId","projectId"]:["scopeId","projectId","workspaceId"])||![value.scope.scopeId,value.scope.projectId,...(value.scope.workspaceId===undefined?[]:[value.scope.workspaceId])].every(v=>this.id(v))||![value.startupTimeoutMs,value.drainTimeoutMs,value.shutdownTimeoutMs].every(v=>Number.isSafeInteger(v)&&v>=1&&v<=300000)||!Number.isSafeInteger(value.maxActiveExecutions)||value.maxActiveExecutions<1||value.maxActiveExecutions>64)throw new RuntimeLifecycleError();this.options=Object.freeze({...value,scope:Object.freeze({...value.scope})});}
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));}
 private id(v:unknown):boolean{return typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);}
}
