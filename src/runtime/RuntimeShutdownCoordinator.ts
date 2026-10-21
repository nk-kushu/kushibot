import { RuntimeAdmissionGate } from "./RuntimeAdmissionGate.js";
import type { IRuntimeFinalizer } from "./IRuntimeFinalizer.js";
import type { IRuntimeQuiescenceBarrier } from "./IRuntimeQuiescenceBarrier.js";
import type { IRuntimeRecoveryWriter } from "./IRuntimeRecoveryWriter.js";
import type { RuntimeShutdownOutcome } from "./RuntimeShutdownOutcome.js";
import type { RuntimeShutdownSnapshot } from "./RuntimeShutdownSnapshot.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import { RuntimeConfiguration } from "./RuntimeConfiguration.js";
import { RuntimeExecutionRegistry } from "./RuntimeExecutionRegistry.js";
import { RuntimeResourcePlan } from "./RuntimeResourcePlan.js";
import { RuntimeControlScope } from "./RuntimeControlScope.js";
import { canonicalWorkflowValue as same } from "../workflows/canonicalWorkflowValue.js";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError.js";
export class RuntimeShutdownCoordinator {
 private readonly finalizers:readonly IRuntimeFinalizer[];
 constructor(private readonly config:RuntimeConfiguration,private readonly executions:RuntimeExecutionRegistry,private readonly resources:RuntimeResourcePlan,private readonly barrier:IRuntimeQuiescenceBarrier,private readonly writer:IRuntimeRecoveryWriter,finalizers:readonly IRuntimeFinalizer[],private readonly clock:IClock,private readonly admission:RuntimeAdmissionGate){if(finalizers.length>16||finalizers.some(f=>!/^[A-Za-z0-9_.:-]{1,128}$/.test(f.id))||new Set(finalizers.map(f=>f.id)).size!==finalizers.length)throw new RuntimeLifecycleError();this.finalizers=Object.freeze([...finalizers]);}
 async cleanupUnadmitted():Promise<RuntimeShutdownOutcome>{if(this.admission.hasOpened()||this.executions.snapshot().length!==0)throw new RuntimeLifecycleError();const phase=RuntimeControlScope.open(this.clock,this.config.options.shutdownTimeoutMs);try{const cleanup=await this.resources.release(phase.control,this.clock,async()=>true);return cleanup.status==="released"?{status:"stopped",recoveryRef:null,pendingOperationRefs:[],cleanup}:{status:"blocked",code:cleanup.code,activeExecutions:this.executions.snapshot(),pendingOperationRefs:[],retainedResourceIds:this.resources.acquiredIds(),recoveryRef:null,cleanup};}finally{phase.dispose();}}
 async shutdown():Promise<RuntimeShutdownOutcome>{this.admission.seal();const drain=RuntimeControlScope.open(this.clock,this.config.options.drainTimeoutMs);let idle=false;try{idle=await this.executions.waitForIdle(drain.control.signal);}finally{drain.dispose();}const phase=RuntimeControlScope.open(this.clock,this.config.options.shutdownTimeoutMs);let recoveryRef:string|null=null,pending:readonly string[]=Object.freeze([]);const blocked=(code:string):RuntimeShutdownOutcome=>({status:"blocked",code,activeExecutions:this.executions.snapshot(),pendingOperationRefs:pending,retainedResourceIds:this.resources.acquiredIds(),recoveryRef,cleanup:null});try{
  try{recoveryRef=await this.writer.save(this.snapshot("draining",pending,null),phase.control);}catch{return blocked("RECOVERY_WRITE_FAILED");}
  if(!idle){this.executions.requestAbort();if(!await this.executions.waitForIdle(phase.control.signal))return blocked("EXECUTIONS_STILL_ACTIVE");}
  if(this.stopped(phase))return blocked("SHUTDOWN_CONTROL_STOP");const lease=await this.barrier.acquire(phase.control);if(lease===null)return blocked("QUIESCENCE_UNPROVEN");try{
   if(same(lease.scope)!==same(this.config.options.scope)||typeof lease.proofRef!=="string"||lease.proofRef.length<1||lease.proofRef.length>256||!Array.isArray(lease.pendingOperationRefs)||lease.pendingOperationRefs.length>100||lease.pendingOperationRefs.some(ref=>typeof ref!=="string"||ref.length<1||ref.length>256)||!await lease.assertHeld())return blocked("QUIESCENCE_UNPROVEN");pending=Object.freeze([...new Set(lease.pendingOperationRefs)]);
   for(const finalizer of this.finalizers){if(this.stopped(phase)||!await lease.assertHeld())return blocked("QUIESCENCE_LOST");try{await finalizer.flush(phase.control);}catch{return blocked("FINALIZATION_FAILED");}}
   if(this.stopped(phase)||!await lease.assertHeld())return blocked("QUIESCENCE_LOST");try{recoveryRef=await this.writer.save(this.snapshot("quiescent",pending,lease.proofRef),phase.control);}catch{return blocked("RECOVERY_WRITE_FAILED");}
   const cleanup=await this.resources.release(phase.control,this.clock,()=>lease.assertHeld());if(cleanup.status!=="released")return {...blocked(cleanup.code),cleanup};return {status:"stopped",recoveryRef,pendingOperationRefs:pending,cleanup};
  }finally{await lease.release();}
 }finally{phase.dispose();}}
 private snapshot(stage:"draining"|"quiescent",pendingOperationRefs:readonly string[],proofRef:string|null):RuntimeShutdownSnapshot{return Object.freeze({schemaVersion:1,runtimeId:this.config.options.runtimeId,scope:this.config.options.scope,stage,activeExecutions:this.executions.snapshot(),pendingOperationRefs,proofRef,retainedResourceIds:this.resources.acquiredIds(),atEpochMs:this.clock.nowEpochMs()});}
 private stopped(phase:RuntimeControlScope):boolean{return phase.control.signal.aborted||this.clock.nowEpochMs()>=phase.control.deadlineEpochMs;}
}
