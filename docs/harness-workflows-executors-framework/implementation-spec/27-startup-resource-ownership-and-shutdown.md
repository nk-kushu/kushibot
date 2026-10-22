# 27. Startup, Resource Ownership, and Shutdown

## What We Implement Here

Create explicit runtime startup, dependency-ordered acquisition, initialization/readiness, admission and actual execution tracking. Drain work before aborting it, obtain a real host quiescence barrier, persist recovery state and mandatory journals, then release only owned resources in reverse order. Failed startup rolls back; uncertain work, failed persistence or failed release keeps required resources available and returns a blocked outcome.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `errors/RuntimeLifecycleError.ts` | `class RuntimeLifecycleError extends Error` |
| `errors/RuntimeAdmissionError.ts` | `class RuntimeAdmissionError extends Error` |
| `runtime/RuntimeOptions.ts` | `type RuntimeOptions` |
| `runtime/RuntimeConfiguration.ts` | `class RuntimeConfiguration` |
| `runtime/RuntimeControl.ts` | `type RuntimeControl` |
| `runtime/RuntimeControlScope.ts` | `class RuntimeControlScope` |
| `runtime/IRuntimeResourceFactory.ts` | `interface IRuntimeResourceFactory<TResource extends object>` |
| `runtime/IRuntimeResourceBinding.ts` | `interface IRuntimeResourceBinding` |
| `runtime/OwnedRuntimeResource.ts` | `class OwnedRuntimeResource<TResource extends object> implements IRuntimeResourceBinding` |
| `runtime/BorrowedRuntimeResource.ts` | `class BorrowedRuntimeResource<TResource extends object> implements IRuntimeResourceBinding` |
| `runtime/RuntimeReleaseOutcome.ts` | `type RuntimeReleaseOutcome` |
| `runtime/RuntimeResourcePlan.ts` | `class RuntimeResourcePlan` |
| `runtime/IRuntimeInitializer.ts` | `interface IRuntimeInitializer` |
| `runtime/IRuntimeReadinessCheck.ts` | `interface IRuntimeReadinessCheck` |
| `runtime/RuntimeStartupOutcome.ts` | `type RuntimeStartupOutcome` |
| `runtime/RuntimeStartupCoordinator.ts` | `class RuntimeStartupCoordinator` |
| `runtime/RuntimeAdmissionGate.ts` | `class RuntimeAdmissionGate` |
| `runtime/ActiveRuntimeExecution.ts` | `type ActiveRuntimeExecution` |
| `runtime/RuntimeExecutionRegistry.ts` | `class RuntimeExecutionRegistry` |
| `runtime/IRuntimeFinalizer.ts` | `interface IRuntimeFinalizer` |
| `runtime/IRuntimeQuiescenceLease.ts` | `interface IRuntimeQuiescenceLease` |
| `runtime/IRuntimeQuiescenceBarrier.ts` | `interface IRuntimeQuiescenceBarrier` |
| `runtime/RuntimeShutdownSnapshot.ts` | `type RuntimeShutdownSnapshot` |
| `runtime/IRuntimeRecoveryWriter.ts` | `interface IRuntimeRecoveryWriter` |
| `runtime/ArtifactRuntimeRecoveryWriter.ts` | `class ArtifactRuntimeRecoveryWriter implements IRuntimeRecoveryWriter` |
| `runtime/RuntimeShutdownOutcome.ts` | `type RuntimeShutdownOutcome` |
| `runtime/RuntimeShutdownCoordinator.ts` | `class RuntimeShutdownCoordinator` |
| `runtime/FrameworkRuntime.ts` | `class FrameworkRuntime` |
| `examples/runtime/createFrameworkRuntimeExample.ts` | `function createFrameworkRuntimeExample` |
| `examples/runtime/runLoginWithLifecycleExample.ts` | `function runLoginWithLifecycleExample` |
| `tests/runtime/checkFrameworkLifecycle.ts` | `function checkFrameworkLifecycle` |
| `runtime/RuntimeShutdownSnapshotContract.ts` | `class RuntimeShutdownSnapshotContract implements IResultContract<RuntimeShutdownSnapshot>` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [01](01-scope-and-implementation-roadmap.md), [02](02-package-structure-and-oop-conventions.md) and [04](04-configuration-and-dependency-injection.md) for general OOP, naming, construction and configuration rules. Each named class/interface/type has its own file; interfaces start with `I`. Composition supplies existing stores, providers, workspaces, journals and runtime adapters. These are future library files; this note opens or closes no user resources.
- Imports and constructors have no connection, timer, worker, schema or provider side effects. The host explicitly constructs the plan and calls start(). Acquire owned handles only through registered factories. Initialize only framework-owned schemas through the existing store initializers; never drop schemas, reset usage, delete run history or automatically take over interrupted work. Startup checks make no paid model inference and never publish changes.
- Resource bindings encode ownership through interchangeable implementations. OwnedRuntimeResource releases its exact factory-owned handle; BorrowedRuntimeResource only attaches/detaches an externally owned client and never calls its close method. Borrowed clients cannot depend on runtime-owned resources that external consumers might still use. The host retains responsibility for external client lifetime and authenticated capability access.
- Declare every actual dependency before startup, including recovery persistence that must outlive a potentially failing dependent release. Use the same gate, registry and resource plan throughout the facade and coordinators; call lifecycle orchestration through FrameworkRuntime rather than bypassing it. Validate unique IDs, known dependencies and an acyclic bounded graph. Acquire dependencies first, initialize stores/registrations afterward, and verify required capability readiness before opening admission. Freeze composition and do not share one owned binding across runtimes/plans. Other application code must not bypass lifecycle ownership or mutate registrations while startup/shutdown is running.
- A resource factory acquire may throw only after proving no unpublished resource remains. If a usable/recoverable handle exists, return it so the owning binding can retain and close it, even if cancellation arrived during acquisition. Separate post-acquisition initialization/readiness from handle acquisition. Factory partial-acquisition cleanup is a required adapter responsibility; hiding a live socket/process in a thrown error violates the contract.
- Phase deadlines are cooperative. RuntimeControlScope owns explicit timers/listeners and disposes them; adapters check the signal/deadline and bound their I/O using host facilities. Do not Promise.race a resource acquisition/release against a timer, forget the still-running promise and report cleanup complete. Await a late handle and release it. JavaScript cannot safely force-terminate an arbitrary noncooperative adapter: an adapter ignoring its contract can keep startup/cleanup awaiting real completion, and needs host termination/fencing. No false bounded-termination guarantee is made.
- Startup is one-shot per runtime. A failed initializer/readiness step aborts admission and releases acquired handles in reverse dependency order with a fresh cleanup window. Rollback closes handles; it does not undo committed framework schema/history writes. If release fails or remains uncertain, retain that resource and its dependencies, report the cleanup failure and allow explicit cleanup retry through an idempotent release adapter. Do not automatically reconstruct clients or silently repeat acquisition.
- Shutdown seals admission immediately, including during startup. It cancels and awaits startup/rollback; a late ready result cannot reopen the gate. A runtime that never admitted work can release partial startup handles without requiring a recovery writer whose backing store may never have opened. A ready runtime follows the full durable shutdown protocol. A stopped runtime cannot restart; create a new lifecycle instance and restore authoritative existing state through the earlier recovery contracts.
- Wrap top-level workflow/session work with runtime.execute. The registry links parent cancellation to a runtime controller, keeps original identity/scope/deadline/reporting, and tracks the actual awaited promise. Reject duplicate active operation identities, wrong scopes and capacity overflow. Child/provider/tool/file lifetimes still belong to their owners and journals; a root promise settling or an empty in-process map alone proves no external quiescence. Normal durable operation idempotency remains mandatory after a local identity is no longer active.
- Drain waits for admitted work during its grace window without immediately aborting it. If work remains, durably save active identities before requesting abort, then await actual local completion within the cleanup window. Aborting does not remove registry entries, clear pending usage, claim cancellation completed or release editing gates. If work ignores abort, return blocked with active identities and retained resources; allow the real work to settle and explicitly retry shutdown. Never close its dependencies underneath it.
- IRuntimeRecoveryWriter and IRuntimeQuiescenceBarrier are required trusted host capabilities. The writer saves safe scoped shutdown state and pins the original authoritative run/session/tool/usage journals for recovery. The barrier excludes/fences actual descendants, processes, provider callbacks, workers and file writers, holds that proof through cleanup, and supplies pending-effect references. A copied scope string, timer, canceled task, expired lease or empty active map is not proof. Use page 24's actual coordination principles; do not steal a live workspace gate.
- Unknown effects can remain after workers are demonstrably quiescent only when their durable identities/usage and original receipts remain available for explicit recovery. Record pending references without inventing zero usage, successful writes, failed publication or rolled-back work. The barrier must prevent old writers from resuming after its lease is released; the runtime gate stays sealed. A checkpoint or shutdown artifact alone never grants recovery ownership or permits replay.
- While the host barrier is held, flush required journals/usage through IRuntimeFinalizer, save the quiescent recovery view, then release owned handles in reverse dependency order. Stop cleanup at any lost proof, expired control, failed required write or uncertain release. Retain every still-acquired dependency. Optional trace flushing cannot replace mandatory journal finalization. Record failures visibly even when diagnostics are disabled.
- Owned release resolves only after actual closure. If it throws, the binding retains the same handle; explicit retry calls the adapter again only because its release contract is idempotent/reconciles the original handle. Never close a recycled raw descriptor or assume a failed close did nothing. A dependency cannot close until its dependent release actually completed. A borrowed binding detaching is not evidence that the external application closed its client.
- ArtifactRuntimeRecoveryWriter uses the existing scoped writer, canonical JSON, content digest and immutable idempotency key. Keep referenced source journals/receipts pinned through the supported recovery window. This artifact is supplemental evidence, not an atomic transaction across all stores. Save quiescent state before closing the artifact/database clients. Do not write a fictitious completed-shutdown record through a connection after closing it or claim a pre-close artifact proves closure already happened. The returned stopped outcome reports actual release results.
- Shutdown attempts are serialized. A successful shutdown returns its saved result on repeat. A blocked attempt can be explicitly retried after work settles or the adapter/persistence problem is resolved; it does not reopen admission, recreate budgets, replay model calls, auto-publish or silently abandon retained handles. Required adapter exceptions may remain visible with admission sealed and the last durable state retained; inspect actual state before administrative recovery.
- Lifecycle records contain only bounded runtime/resource/operation/run IDs, timestamps, proof references and pending references. They contain no credentials, full prompts, task/source text or private reasoning. Runtime instances are exact-scope; multi-project hosts must construct separate authorized lifecycles or explicitly design a broader coordinator, not widen a scoped artifact writer. The host owns OS signals and calls shutdown; the library installs no process-wide signal handlers and never calls process.exit.
- Application composition supplies schema initializers, registration/readiness checks, mandatory finalizers, the scoped recovery writer and the real quiescence barrier for its actual adapters. Missing capability implementation must fail readiness or block shutdown; a no-op flush, fake proof string or fixture writer is not production integration. Externally owned clients must remain open after runtime shutdown. The host can terminate its process only under its own policy after inspecting blocked resources and durable pending work.
- The offline example demonstrates explicit startup → admitted login workflow → shutdown, preserving the work result separately from cleanup status. Its acceptance function checks constructor inactivity, dependency order, required flush/save-before-close order, borrowed preservation, reverse closure and idempotent shutdown. Additional checks cover cycles, failed/late acquisition, rollback failure/retry, shutdown during startup, concurrent shutdown, full admission, abort-ignoring work, missing/lost quiescence, persistence/finalizer failure, pending references and timer/listener cleanup. Production adapters require their own actual process/resource-lifetime tests.

## TypeScript Code for Each File

### `errors/RuntimeLifecycleError.ts`

Reports invalid runtime configuration, ownership/dependency state or adapter contracts without exposing credentials or task contents.

```typescript
export class RuntimeLifecycleError extends Error {readonly code="RUNTIME_LIFECYCLE_INVALID";constructor(){super("Runtime configuration, resource state, or lifecycle contract is invalid.");this.name="RuntimeLifecycleError";}}
```

### `errors/RuntimeAdmissionError.ts`

Rejects new execution when the runtime is not ready, is draining, or cannot accept another active identity.

```typescript
export class RuntimeAdmissionError extends Error {readonly code="RUNTIME_ADMISSION_CLOSED";constructor(){super("Runtime admission is closed, full, or the execution identity is already active.");this.name="RuntimeAdmissionError";}}
```

### `runtime/RuntimeOptions.ts`

Defines one scoped runtime and bounded phase windows. These are lifecycle coordination limits; they never replace or reset task/provider budgets.

```typescript
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
export type RuntimeOptions=Readonly<{runtimeId:string;scope:ExecutionScopeRef;startupTimeoutMs:number;drainTimeoutMs:number;shutdownTimeoutMs:number;maxActiveExecutions:number}>;
```

### `runtime/RuntimeConfiguration.ts`

Validates and freezes runtime settings. Constructors perform no connection, timer, schema or provider activity.

```typescript
import type { RuntimeOptions } from "./RuntimeOptions";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError";
export class RuntimeConfiguration {
 readonly options:RuntimeOptions;
 constructor(value:RuntimeOptions){if(!this.keys(value,["runtimeId","scope","startupTimeoutMs","drainTimeoutMs","shutdownTimeoutMs","maxActiveExecutions"])||!this.id(value.runtimeId)||!this.keys(value.scope,value.scope?.workspaceId===undefined?["scopeId","projectId"]:["scopeId","projectId","workspaceId"])||![value.scope.scopeId,value.scope.projectId,...(value.scope.workspaceId===undefined?[]:[value.scope.workspaceId])].every(v=>this.id(v))||![value.startupTimeoutMs,value.drainTimeoutMs,value.shutdownTimeoutMs].every(v=>Number.isSafeInteger(v)&&v>=1&&v<=300000)||!Number.isSafeInteger(value.maxActiveExecutions)||value.maxActiveExecutions<1||value.maxActiveExecutions>64)throw new RuntimeLifecycleError();this.options=Object.freeze({...value,scope:Object.freeze({...value.scope})});}
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));}
 private id(v:unknown):boolean{return typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);}
}
```

### `runtime/RuntimeControl.ts`

Carries cooperative cancellation and an absolute phase deadline to lifecycle adapters. Actual task contexts retain their original identities, deadlines and shared accounting.

```typescript
export type RuntimeControl=Readonly<{signal:AbortSignal;deadlineEpochMs:number}>;
```

### `runtime/RuntimeControlScope.ts`

Explicitly opens one phase timer and optional parent cancellation link. Dispose clears both. Callers await real acquisition/release promises and never abandon a late handle through a timeout race.

```typescript
import type { IClock } from "../contracts/runtime/IClock";
import type { RuntimeControl } from "./RuntimeControl";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError";
export class RuntimeControlScope {
 readonly control:RuntimeControl;private readonly controller=new AbortController();private timer:ReturnType<typeof setTimeout>|null=null;private parent:AbortSignal|undefined;private listener:(()=>void)|undefined;
 private constructor(deadline:number){this.control=Object.freeze({signal:this.controller.signal,deadlineEpochMs:deadline});}
 static open(clock:IClock,timeoutMs:number,parent?:AbortSignal):RuntimeControlScope{const now=clock.nowEpochMs(),deadline=now+timeoutMs;if(!Number.isSafeInteger(now)||now<0||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000||!Number.isSafeInteger(deadline))throw new RuntimeLifecycleError();const scope=new RuntimeControlScope(deadline);scope.timer=setTimeout(()=>{scope.controller.abort();},timeoutMs);if(parent!==undefined){scope.parent=parent;scope.listener=()=>scope.controller.abort();parent.addEventListener("abort",scope.listener,{once:true});if(parent.aborted)scope.controller.abort();}return scope;}
 cancel():void{this.controller.abort();}
 dispose():void{if(this.timer!==null){clearTimeout(this.timer);this.timer=null;}if(this.parent!==undefined&&this.listener!==undefined)this.parent.removeEventListener("abort",this.listener);this.parent=undefined;this.listener=undefined;}
}
```

### `runtime/IRuntimeResourceFactory.ts`

Acquires an owned handle without exposing it before completion and releases that exact handle. Acquire may throw only after proving no unpublished resource remains; otherwise it must return a recoverable handle. Release resolves only after actual closure and must safely reconcile/idempotently retry an earlier uncertain release.

```typescript
import type { RuntimeControl } from "./RuntimeControl";
export interface IRuntimeResourceFactory<TResource extends object>{acquire(control:RuntimeControl):Promise<TResource>;release(resource:TResource,control:RuntimeControl):Promise<void>;}
```

### `runtime/IRuntimeResourceBinding.ts`

Provides dependency-aware lifecycle operations without exposing resource-specific clients to the coordinator. Owned and borrowed bindings implement different behavior through the same contract.

```typescript
import type { RuntimeControl } from "./RuntimeControl";
export interface IRuntimeResourceBinding {readonly id:string;readonly dependencies:readonly string[];isAcquired():boolean;acquire(control:RuntimeControl):Promise<void>;release(control:RuntimeControl):Promise<void>;}
```

### `runtime/OwnedRuntimeResource.ts`

Owns exactly one acquired handle and retains it after uncertain/failed release. Acquisition is one-shot; explicit cleanup retries release the same handle through its idempotent adapter. A late acquire result is retained before startup checks controls and rolls back.

```typescript
import type { IRuntimeResourceBinding } from "./IRuntimeResourceBinding";
import type { IRuntimeResourceFactory } from "./IRuntimeResourceFactory";
import type { RuntimeControl } from "./RuntimeControl";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError";
export class OwnedRuntimeResource<TResource extends object> implements IRuntimeResourceBinding {
 readonly dependencies:readonly string[];private handle:TResource|undefined;private attempted=false;private releasing:Promise<void>|null=null;
 constructor(readonly id:string,dependencies:readonly string[],private readonly factory:IRuntimeResourceFactory<TResource>){this.dependencies=Object.freeze([...dependencies]);}
 isAcquired():boolean{return this.handle!==undefined;}
 value():TResource{if(this.handle===undefined)throw new RuntimeLifecycleError();return this.handle;}
 async acquire(control:RuntimeControl):Promise<void>{if(this.handle!==undefined)return;if(this.attempted)throw new RuntimeLifecycleError();this.attempted=true;const handle=await this.factory.acquire(control);if(handle===null||(typeof handle!=="object"&&typeof handle!=="function"))throw new RuntimeLifecycleError();this.handle=handle;}
 release(control:RuntimeControl):Promise<void>{if(this.handle===undefined)return Promise.resolve();if(this.releasing!==null)return this.releasing;const handle=this.handle;this.releasing=(async()=>{await this.factory.release(handle,control);this.handle=undefined;})();const task=this.releasing;return task.finally(()=>{if(this.releasing===task)this.releasing=null;});}
}
```

### `runtime/BorrowedRuntimeResource.ts`

Borrows an already application-owned client. Acquire/release only attach/detach the runtime view; neither closes nor recreates the client. Borrowed clients have no owned-runtime dependencies, since the framework cannot stop external consumers of them.

```typescript
import type { IRuntimeResourceBinding } from "./IRuntimeResourceBinding";
import type { RuntimeControl } from "./RuntimeControl";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError";
export class BorrowedRuntimeResource<TResource extends object> implements IRuntimeResourceBinding {
 readonly dependencies:readonly string[]=Object.freeze([]);private attached=false;
 constructor(readonly id:string,private readonly handle:TResource){if(handle===null||(typeof handle!=="object"&&typeof handle!=="function"))throw new RuntimeLifecycleError();}
 isAcquired():boolean{return this.attached;}
 value():TResource{if(!this.attached)throw new RuntimeLifecycleError();return this.handle;}
 async acquire(_control:RuntimeControl):Promise<void>{this.attached=true;}
 async release(_control:RuntimeControl):Promise<void>{this.attached=false;}
}
```

### `runtime/RuntimeReleaseOutcome.ts`

Reports actual released handles or a blocked reverse-order cleanup. Dependencies of a resource that may still be live are retained rather than closed underneath it.

```typescript
export type RuntimeReleaseOutcome=Readonly<{status:"released";releasedResourceIds:readonly string[];retainedResourceIds:readonly string[]}>|Readonly<{status:"blocked";code:"RELEASE_FAILED"|"CLEANUP_CONTROL_STOP"|"QUIESCENCE_LOST";failedResourceId:string|null;releasedResourceIds:readonly string[];retainedResourceIds:readonly string[]}>;
```

### `runtime/RuntimeResourcePlan.ts`

Validates the bounded dependency DAG and computes deterministic acquisition order. Release runs in reverse order and stops on the first uncertain release/control/proof failure, preserving every still-acquired dependency. Dependencies must describe all real client/use relationships.

```typescript
import type { IRuntimeResourceBinding } from "./IRuntimeResourceBinding";
import type { RuntimeControl } from "./RuntimeControl";
import type { RuntimeReleaseOutcome } from "./RuntimeReleaseOutcome";
import type { IClock } from "../contracts/runtime/IClock";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError";
export class RuntimeResourcePlan {
 readonly ordered:readonly IRuntimeResourceBinding[];
 constructor(bindings:readonly IRuntimeResourceBinding[]){if(bindings.length>32)throw new RuntimeLifecycleError();const byId=new Map<string,IRuntimeResourceBinding>();for(const b of bindings){if(!/^[A-Za-z0-9_.:-]{1,128}$/.test(b.id)||byId.has(b.id)||b.dependencies.length>32||new Set(b.dependencies).size!==b.dependencies.length||b.isAcquired())throw new RuntimeLifecycleError();byId.set(b.id,b);}const visiting=new Set<string>(),visited=new Set<string>(),order:IRuntimeResourceBinding[]=[];for(const b of bindings)this.visit(b,byId,visiting,visited,order);this.ordered=Object.freeze(order);}
 acquiredIds():readonly string[]{return Object.freeze(this.ordered.filter(b=>b.isAcquired()).map(b=>b.id));}
 async release(control:RuntimeControl,clock:IClock,permit:()=>Promise<boolean>):Promise<RuntimeReleaseOutcome>{const released:string[]=[];for(const b of [...this.ordered].reverse()){if(!b.isAcquired())continue;if(control.signal.aborted||clock.nowEpochMs()>=control.deadlineEpochMs)return {status:"blocked",code:"CLEANUP_CONTROL_STOP",failedResourceId:null,releasedResourceIds:Object.freeze(released),retainedResourceIds:this.acquiredIds()};let allowed=false;try{allowed=await permit();}catch{}if(!allowed)return {status:"blocked",code:"QUIESCENCE_LOST",failedResourceId:b.id,releasedResourceIds:Object.freeze(released),retainedResourceIds:this.acquiredIds()};if(control.signal.aborted||clock.nowEpochMs()>=control.deadlineEpochMs)return {status:"blocked",code:"CLEANUP_CONTROL_STOP",failedResourceId:b.id,releasedResourceIds:Object.freeze(released),retainedResourceIds:this.acquiredIds()};try{await b.release(control);}catch{return {status:"blocked",code:"RELEASE_FAILED",failedResourceId:b.id,releasedResourceIds:Object.freeze(released),retainedResourceIds:this.acquiredIds()};}if(b.isAcquired())return {status:"blocked",code:"RELEASE_FAILED",failedResourceId:b.id,releasedResourceIds:Object.freeze(released),retainedResourceIds:this.acquiredIds()};released.push(b.id);}return {status:"released",releasedResourceIds:Object.freeze(released),retainedResourceIds:this.acquiredIds()};}
 private visit(b:IRuntimeResourceBinding,byId:ReadonlyMap<string,IRuntimeResourceBinding>,visiting:Set<string>,visited:Set<string>,order:IRuntimeResourceBinding[]):void{if(visited.has(b.id))return;if(visiting.has(b.id))throw new RuntimeLifecycleError();visiting.add(b.id);for(const id of b.dependencies){const dependency=byId.get(id);if(dependency===undefined)throw new RuntimeLifecycleError();this.visit(dependency,byId,visiting,visited,order);}visiting.delete(b.id);visited.add(b.id);order.push(b);}
}
```

### `runtime/IRuntimeInitializer.ts`

Performs required explicit bootstrap after resources exist: initialize framework schemas, validate registrations and attach authorized scoped stores. Completion must mean actual initialization finished. Rollback closes owned handles; it never deletes durable schemas/history.

```typescript
import type { RuntimeControl } from "./RuntimeControl";
export interface IRuntimeInitializer {readonly id:string;initialize(control:RuntimeControl):Promise<void>;}
```

### `runtime/IRuntimeReadinessCheck.ts`

Verifies required host capabilities before admission opens, including scoped journals, models/tools/workspace bindings and required approval/source/target adapters. It performs no paid inference or automatic recovery/publication.

```typescript
import type { RuntimeControl } from "./RuntimeControl";
export interface IRuntimeReadinessCheck {readonly id:string;verify(control:RuntimeControl):Promise<boolean>;}
```

### `runtime/RuntimeStartupOutcome.ts`

Returns ready only after acquisition, required initialization and readiness pass. Failure includes rollback results and retained handles; it never hides failed cleanup as successful startup.

```typescript
import type { RuntimeReleaseOutcome } from "./RuntimeReleaseOutcome";
export type RuntimeStartupOutcome=Readonly<{status:"ready";acquiredResourceIds:readonly string[]}>|Readonly<{status:"failed";code:"STARTUP_CONTROL_STOP"|"STARTUP_STEP_FAILED";stepId:string;cleanup:RuntimeReleaseOutcome}>;
```

### `runtime/RuntimeStartupCoordinator.ts`

Acquires in dependency order, then initializes/checks, all under cooperative startup controls. On failure it awaits late results and rolls back with a fresh cleanup window. No caller is admitted during startup.

```typescript
import { RuntimeAdmissionGate } from "./RuntimeAdmissionGate";
import type { IRuntimeInitializer } from "./IRuntimeInitializer";
import type { IRuntimeReadinessCheck } from "./IRuntimeReadinessCheck";
import type { RuntimeStartupOutcome } from "./RuntimeStartupOutcome";
import type { IClock } from "../contracts/runtime/IClock";
import { RuntimeControlScope } from "./RuntimeControlScope";
import { RuntimeResourcePlan } from "./RuntimeResourcePlan";
import { RuntimeConfiguration } from "./RuntimeConfiguration";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError";
export class RuntimeStartupCoordinator {
 private readonly initializers:readonly IRuntimeInitializer[];private readonly checks:readonly IRuntimeReadinessCheck[];
 constructor(private readonly config:RuntimeConfiguration,private readonly resources:RuntimeResourcePlan,initializers:readonly IRuntimeInitializer[],checks:readonly IRuntimeReadinessCheck[],private readonly clock:IClock,private readonly admission:RuntimeAdmissionGate){if(initializers.length>16||checks.length>16||[...initializers,...checks].some(v=>!/^[A-Za-z0-9_.:-]{1,128}$/.test(v.id))||new Set([...initializers,...checks].map(v=>v.id)).size!==initializers.length+checks.length)throw new RuntimeLifecycleError();this.initializers=Object.freeze([...initializers]);this.checks=Object.freeze([...checks]);}
 async start(signal:AbortSignal):Promise<RuntimeStartupOutcome>{const phase=RuntimeControlScope.open(this.clock,this.config.options.startupTimeoutMs,signal);let stepId="startup",code:"STARTUP_CONTROL_STOP"|"STARTUP_STEP_FAILED"="STARTUP_STEP_FAILED";try{for(const binding of this.resources.ordered){stepId=binding.id;if(this.stopped(phase)){code="STARTUP_CONTROL_STOP";throw new RuntimeLifecycleError();}await binding.acquire(phase.control);}for(const initializer of this.initializers){stepId=initializer.id;if(this.stopped(phase)){code="STARTUP_CONTROL_STOP";throw new RuntimeLifecycleError();}await initializer.initialize(phase.control);}for(const check of this.checks){stepId=check.id;if(this.stopped(phase)){code="STARTUP_CONTROL_STOP";throw new RuntimeLifecycleError();}if(!await check.verify(phase.control))throw new RuntimeLifecycleError();}if(this.stopped(phase)){code="STARTUP_CONTROL_STOP";throw new RuntimeLifecycleError();}return {status:"ready",acquiredResourceIds:this.resources.acquiredIds()};}catch{if(this.stopped(phase))code="STARTUP_CONTROL_STOP";}finally{phase.dispose();}const cleanup=RuntimeControlScope.open(this.clock,this.config.options.shutdownTimeoutMs);try{return {status:"failed",code,stepId,cleanup:await this.resources.release(cleanup.control,this.clock,async()=>true)};}finally{cleanup.dispose();}}
 async cancelReady():Promise<RuntimeStartupOutcome>{if(this.admission.hasOpened())throw new RuntimeLifecycleError();const cleanup=RuntimeControlScope.open(this.clock,this.config.options.shutdownTimeoutMs);try{return {status:"failed",code:"STARTUP_CONTROL_STOP",stepId:"admission",cleanup:await this.resources.release(cleanup.control,this.clock,async()=>true)};}finally{cleanup.dispose();}}
 private stopped(phase:RuntimeControlScope):boolean{return phase.control.signal.aborted||this.clock.nowEpochMs()>=phase.control.deadlineEpochMs;}
}
```

### `runtime/RuntimeAdmissionGate.ts`

Opens only after startup and seals permanently before drain. A sealed gate cannot reopen when a late startup result arrives.

```typescript
import { RuntimeAdmissionError } from "../errors/RuntimeAdmissionError";
export class RuntimeAdmissionGate {private ready=false;private sealed=false;private everOpened=false;open():void{if(this.sealed)throw new RuntimeAdmissionError();this.ready=true;this.everOpened=true;}hasOpened():boolean{return this.everOpened;}seal():void{this.sealed=true;this.ready=false;}assertOpen():void{if(!this.ready||this.sealed)throw new RuntimeAdmissionError();}}
```

### `runtime/ActiveRuntimeExecution.ts`

Keeps safe identities of currently awaited top-level work. It is an in-process admission view, not proof that all child/tool/provider/file effects are settled; authoritative journals and the host barrier still decide quiescence.

```typescript
import type { ExecutionIdentity } from "../contracts/runtime/ExecutionIdentity";
export type ActiveRuntimeExecution=Readonly<{identity:ExecutionIdentity;startedAtEpochMs:number}>;
```

### `runtime/RuntimeExecutionRegistry.ts`

Tracks actual promise lifetime and linked abort controllers. Requesting abort does not remove work. Waiters/listeners are cleaned up on idle or cancellation; a bounded drain returns false while work remains active.

```typescript
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { ActiveRuntimeExecution } from "./ActiveRuntimeExecution";
import type { IClock } from "../contracts/runtime/IClock";
import { RuntimeConfiguration } from "./RuntimeConfiguration";
import { canonicalWorkflowValue as same } from "../workflows/canonicalWorkflowValue";
import { RuntimeAdmissionError } from "../errors/RuntimeAdmissionError";
export class RuntimeExecutionRegistry {
 private readonly active=new Map<string,Readonly<{record:ActiveRuntimeExecution;controller:AbortController}>>();private readonly waiters=new Set<()=>void>();
 constructor(private readonly config:RuntimeConfiguration,private readonly clock:IClock){}
 snapshot():readonly ActiveRuntimeExecution[]{return Object.freeze([...this.active.values()].map(v=>v.record));}
 async run<T>(context:IExecutionContext,work:(context:IExecutionContext)=>Promise<T>):Promise<T>{const id=context.identity.operationId;if(!this.identity(context.identity)||same(context.scope)!==same(this.config.options.scope)||this.active.has(id)||this.active.size>=this.config.options.maxActiveExecutions)throw new RuntimeAdmissionError();const controller=new AbortController(),onAbort=()=>controller.abort();context.signal.addEventListener("abort",onAbort,{once:true});if(context.signal.aborted)controller.abort();const now=this.clock.nowEpochMs();if(!Number.isSafeInteger(now)||now<0){context.signal.removeEventListener("abort",onAbort);throw new RuntimeAdmissionError();}const identity=Object.freeze({...context.identity}),record=Object.freeze({identity,startedAtEpochMs:now});this.active.set(id,{record,controller});try{return await work(Object.freeze({...context,identity,scope:this.config.options.scope,signal:controller.signal}));}finally{context.signal.removeEventListener("abort",onAbort);this.active.delete(id);if(this.active.size===0)for(const notify of [...this.waiters])notify();}}
 private identity(value:Readonly<Record<string,unknown>>):boolean{return value!==null&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).every(key=>["operationId","runId","stepRunId","sessionId","parentOperationId"].includes(key))&&typeof value.operationId==="string"&&Object.values(value).every(v=>typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v));}
 requestAbort():void{for(const value of this.active.values())value.controller.abort();}
 waitForIdle(signal:AbortSignal):Promise<boolean>{if(this.active.size===0)return Promise.resolve(true);if(signal.aborted)return Promise.resolve(false);return new Promise(resolve=>{const finish=(idle:boolean)=>{this.waiters.delete(onIdle);signal.removeEventListener("abort",onAbort);resolve(idle);},onIdle=()=>finish(true),onAbort=()=>finish(false);this.waiters.add(onIdle);signal.addEventListener("abort",onAbort,{once:true});if(this.active.size===0)finish(true);else if(signal.aborted)finish(false);});}
}
```

### `runtime/IRuntimeFinalizer.ts`

Flushes required run/session/usage/operation state after work is actually fenced/drained. It must resolve only after mandatory writes finish; failure retains storage resources. It makes no new inference or effect replay.

```typescript
import type { RuntimeControl } from "./RuntimeControl";
export interface IRuntimeFinalizer {readonly id:string;flush(control:RuntimeControl):Promise<void>;}
```

### `runtime/IRuntimeQuiescenceLease.ts`

Is a host-held barrier excluding old workers, descendants, callbacks and writers through cleanup. It carries current pending-effect references for recovery. An idle local map or expired timestamp is not this proof.

```typescript
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
export interface IRuntimeQuiescenceLease {readonly scope:ExecutionScopeRef;readonly proofRef:string;readonly pendingOperationRefs:readonly string[];assertHeld():Promise<boolean>;release():Promise<void>;}
```

### `runtime/IRuntimeQuiescenceBarrier.ts`

Coordinates actual scoped process/tool/workspace lifetime and durable journals before storage closes. Unknown effects may remain only when their identities are durable and no unfenced worker/callback can write. Missing proof returns null; it never steals an editing gate by TTL.

```typescript
import type { RuntimeControl } from "./RuntimeControl";
import type { IRuntimeQuiescenceLease } from "./IRuntimeQuiescenceLease";
export interface IRuntimeQuiescenceBarrier {acquire(control:RuntimeControl):Promise<IRuntimeQuiescenceLease|null>;}
```

### `runtime/RuntimeShutdownSnapshot.ts`

Saves safe active identities, pending effect references and retained resource IDs before abort/closure. A quiescent record means ready to close, not that resources were already closed. No final record is written through a store after its connection is closed.

```typescript
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import type { ActiveRuntimeExecution } from "./ActiveRuntimeExecution";
export type RuntimeShutdownSnapshot=Readonly<{schemaVersion:1;runtimeId:string;scope:ExecutionScopeRef;stage:"draining"|"quiescent";activeExecutions:readonly ActiveRuntimeExecution[];pendingOperationRefs:readonly string[];proofRef:string|null;retainedResourceIds:readonly string[];atEpochMs:number}>;
```

### `runtime/IRuntimeRecoveryWriter.ts`

Durably saves the exact bounded shutdown view and pins references to existing authoritative run/session/tool/usage journals. A writer return means commit finished; saving a snapshot never clears pending effects or resets counters.

```typescript
import type { RuntimeShutdownSnapshot } from "./RuntimeShutdownSnapshot";
import type { RuntimeControl } from "./RuntimeControl";
export interface IRuntimeRecoveryWriter {save(snapshot:RuntimeShutdownSnapshot,control:RuntimeControl):Promise<string>;}
```

### `runtime/ArtifactRuntimeRecoveryWriter.ts`

Writes a content-addressed scoped artifact using an already bound writer. The host must retain referenced authoritative journals through recovery; this artifact supplements them and is not a cross-store checkpoint transaction.

```typescript
import type { IRuntimeRecoveryWriter } from "./IRuntimeRecoveryWriter";
import type { RuntimeShutdownSnapshot } from "./RuntimeShutdownSnapshot";
import type { RuntimeControl } from "./RuntimeControl";
import type { IArtifactWriter } from "../artifacts/IArtifactWriter";
import type { IArtifactDigest } from "../artifacts/IArtifactDigest";
import type { IClock } from "../contracts/runtime/IClock";
import { RuntimeShutdownSnapshotContract } from "./RuntimeShutdownSnapshotContract";
import { RuntimeConfiguration } from "./RuntimeConfiguration";
import { canonicalWorkflowValue as same } from "../workflows/canonicalWorkflowValue";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError";
export class ArtifactRuntimeRecoveryWriter implements IRuntimeRecoveryWriter {
 constructor(private readonly config:RuntimeConfiguration,private readonly writer:IArtifactWriter,private readonly digest:IArtifactDigest,private readonly records:RuntimeShutdownSnapshotContract,private readonly clock:IClock){}
 async save(snapshot:RuntimeShutdownSnapshot,control:RuntimeControl):Promise<string>{if(control.signal.aborted||this.clock.nowEpochMs()>=control.deadlineEpochMs||snapshot.runtimeId!==this.config.options.runtimeId||same(snapshot.scope)!==same(this.config.options.scope)||snapshot.activeExecutions.length>64||snapshot.pendingOperationRefs.length>100||snapshot.retainedResourceIds.length>32)throw new RuntimeLifecycleError();const checked=await this.records.validate(snapshot);if(!checked.valid)throw new RuntimeLifecycleError();const bytes=new TextEncoder().encode(JSON.stringify(checked.value));if(bytes.byteLength>65536)throw new RuntimeLifecycleError();const hash=await this.digest.hash(bytes),ref=await this.writer.write({name:"runtime-shutdown",kind:"runtime-shutdown",mediaType:"application/json",schemaId:"runtime-shutdown",schemaVersion:"1",sourceRefs:[...snapshot.pendingOperationRefs],idempotencyKey:"runtime-shutdown:"+hash,expiresAtEpochMs:null,data:bytes},control.signal);return "artifact:"+ref.artifactId;}
}
```

### `runtime/RuntimeShutdownOutcome.ts`

Returns stopped only after actual quiescence, durable recovery state and successful release. A blocked result retains active/pending identities, recovery reference when known and every still-owned resource.

```typescript
import type { ActiveRuntimeExecution } from "./ActiveRuntimeExecution";
import type { RuntimeReleaseOutcome } from "./RuntimeReleaseOutcome";
export type RuntimeShutdownOutcome=Readonly<{status:"stopped";recoveryRef:string|null;pendingOperationRefs:readonly string[];cleanup:RuntimeReleaseOutcome}>|Readonly<{status:"blocked";code:string;activeExecutions:readonly ActiveRuntimeExecution[];pendingOperationRefs:readonly string[];retainedResourceIds:readonly string[];recoveryRef:string|null;cleanup:RuntimeReleaseOutcome|null}>;
```

### `runtime/RuntimeShutdownCoordinator.ts`

Drains admitted work, persists recovery identities before forced abort, waits for actual local completion, obtains a real host barrier, flushes mandatory journals, saves quiescent state and releases resources in reverse dependency order. Unknown activity or failed persistence blocks cleanup instead of closing dependencies prematurely.

```typescript
import { RuntimeAdmissionGate } from "./RuntimeAdmissionGate";
import type { IRuntimeFinalizer } from "./IRuntimeFinalizer";
import type { IRuntimeQuiescenceBarrier } from "./IRuntimeQuiescenceBarrier";
import type { IRuntimeRecoveryWriter } from "./IRuntimeRecoveryWriter";
import type { RuntimeShutdownOutcome } from "./RuntimeShutdownOutcome";
import type { RuntimeShutdownSnapshot } from "./RuntimeShutdownSnapshot";
import type { IClock } from "../contracts/runtime/IClock";
import { RuntimeConfiguration } from "./RuntimeConfiguration";
import { RuntimeExecutionRegistry } from "./RuntimeExecutionRegistry";
import { RuntimeResourcePlan } from "./RuntimeResourcePlan";
import { RuntimeControlScope } from "./RuntimeControlScope";
import { canonicalWorkflowValue as same } from "../workflows/canonicalWorkflowValue";
import { RuntimeLifecycleError } from "../errors/RuntimeLifecycleError";
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
```

### `runtime/FrameworkRuntime.ts`

Owns one-shot startup, admission and serialized shutdown attempts. Shutdown seals admission immediately and cancels/awaits startup before draining; a late startup result cannot reopen it. Successful shutdown is idempotent. A blocked shutdown may be explicitly retried without resetting task state or budgets.

```typescript
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { RuntimeStartupOutcome } from "./RuntimeStartupOutcome";
import type { RuntimeShutdownOutcome } from "./RuntimeShutdownOutcome";
import { RuntimeStartupCoordinator } from "./RuntimeStartupCoordinator";
import { RuntimeShutdownCoordinator } from "./RuntimeShutdownCoordinator";
import { RuntimeAdmissionGate } from "./RuntimeAdmissionGate";
import { RuntimeExecutionRegistry } from "./RuntimeExecutionRegistry";
import { RuntimeAdmissionError } from "../errors/RuntimeAdmissionError";
export class FrameworkRuntime {
 private readonly startupAbort=new AbortController();private startup:Promise<RuntimeStartupOutcome>|null=null;private stopping:Promise<RuntimeShutdownOutcome>|null=null;private stopped:RuntimeShutdownOutcome|null=null;private sealed=false;private opened=false;
 constructor(private readonly startupCoordinator:RuntimeStartupCoordinator,private readonly shutdownCoordinator:RuntimeShutdownCoordinator,private readonly admission:RuntimeAdmissionGate,private readonly executions:RuntimeExecutionRegistry){}
 start():Promise<RuntimeStartupOutcome>{if(this.startup!==null)return this.startup;if(this.sealed)return Promise.reject(new RuntimeAdmissionError());this.startup=this.startupCoordinator.start(this.startupAbort.signal).then(async result=>{if(result.status==="ready"){if(this.sealed)return this.startupCoordinator.cancelReady();this.admission.open();this.opened=true;}return result;});return this.startup;}
 execute<T>(context:IExecutionContext,work:(context:IExecutionContext)=>Promise<T>):Promise<T>{this.admission.assertOpen();return this.executions.run(context,work);}
 shutdown():Promise<RuntimeShutdownOutcome>{if(this.stopped!==null)return Promise.resolve(this.stopped);if(this.stopping!==null)return this.stopping;this.sealed=true;this.admission.seal();this.startupAbort.abort();const attempt=(async()=>{if(this.startup!==null)await this.startup;const outcome=await (this.opened?this.shutdownCoordinator.shutdown():this.shutdownCoordinator.cleanupUnadmitted());if(outcome.status==="stopped")this.stopped=outcome;return outcome;})();this.stopping=attempt;return attempt.finally(()=>{if(this.stopping===attempt)this.stopping=null;});}
}
```

### `examples/runtime/createFrameworkRuntimeExample.ts`

Assembles lifecycle coordination from explicitly supplied owned/borrowed bindings, schema initializers, readiness checks, mandatory finalizers and the host quiescence/recovery capabilities. Constructing the runtime opens no connections. The application explicitly calls start, executes admitted work and calls shutdown.

```typescript
import type { RuntimeOptions, IRuntimeResourceBinding, IRuntimeInitializer, IRuntimeReadinessCheck, IRuntimeFinalizer, IRuntimeQuiescenceBarrier, IRuntimeRecoveryWriter, IClock } from "../../index";
import { RuntimeConfiguration, RuntimeResourcePlan, RuntimeAdmissionGate, RuntimeExecutionRegistry, RuntimeStartupCoordinator, RuntimeShutdownCoordinator, FrameworkRuntime } from "../../index";
export function createFrameworkRuntimeExample(options:RuntimeOptions,bindings:readonly IRuntimeResourceBinding[],initializers:readonly IRuntimeInitializer[],checks:readonly IRuntimeReadinessCheck[],finalizers:readonly IRuntimeFinalizer[],barrier:IRuntimeQuiescenceBarrier,writer:IRuntimeRecoveryWriter,clock:IClock):FrameworkRuntime{
 const config=new RuntimeConfiguration(options),resources=new RuntimeResourcePlan(bindings),admission=new RuntimeAdmissionGate(),executions=new RuntimeExecutionRegistry(config,clock);
 return new FrameworkRuntime(new RuntimeStartupCoordinator(config,resources,initializers,checks,clock,admission),new RuntimeShutdownCoordinator(config,executions,resources,barrier,writer,finalizers,clock,admission),admission,executions);
}
```

### `examples/runtime/runLoginWithLifecycleExample.ts`

Shows the host calling explicit startup, running a workflow through admission, then shutting down. The work result is preserved separately from shutdown status; blocked cleanup is not rewritten as a failed or rolled-back task.

```typescript
import type { IExecutionContext, WorkflowEngineOutcome } from "../../index";
import { FrameworkRuntime, WorkflowEngine } from "../../index";
export async function runLoginWithLifecycleExample(runtime:FrameworkRuntime,engine:WorkflowEngine,context:IExecutionContext){
 const startup=await runtime.start();
 if(startup.status!=="ready")return {startup,work:null,shutdown:await runtime.shutdown()};
 let work:WorkflowEngineOutcome|null=null,workErrorCode:string|null=null;
 try{work=await runtime.execute(context,ownedContext=>engine.run(ownedContext));}catch{workErrorCode="HOST_WORK_FAILED";}
 try{return {startup,work,workErrorCode,shutdown:await runtime.shutdown(),shutdownErrorCode:null};}
 catch{return {startup,work,workErrorCode,shutdown:null,shutdownErrorCode:"SHUTDOWN_ADAPTER_FAILED"};}
}
```

### `tests/runtime/checkFrameworkLifecycle.ts`

Exercises deterministic ownership and ordering with offline resource/barrier/writer fixtures: no constructor acquisition, explicit startup, admitted work, durable-before-close ordering, reverse release, borrowed-client preservation and idempotent shutdown. This does not establish real host process/worker fencing.

```typescript
import type { RuntimeOptions, IExecutionContext, RuntimeShutdownSnapshot } from "../../index";
import { OwnedRuntimeResource, BorrowedRuntimeResource } from "../../index";
import { createFrameworkRuntimeExample } from "../../examples/runtime/createFrameworkRuntimeExample";
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
```

### `runtime/RuntimeShutdownSnapshotContract.ts`

Validates exact persisted shutdown fields, safe bounded identities, unique references, phase/proof consistency and timestamps. Restored/external shutdown artifacts require this contract plus scoped artifact integrity and authoritative journal/barrier checks; a valid snapshot never authorizes replay.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { RuntimeShutdownSnapshot } from "./RuntimeShutdownSnapshot";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class RuntimeShutdownSnapshotContract implements IResultContract<RuntimeShutdownSnapshot>{
 readonly id="runtime-shutdown";readonly version="1";
 constructor(private readonly json:JsonValueContract){}
 async validate(raw:unknown):Promise<ValidationResult<RuntimeShutdownSnapshot>>{const checked=await this.json.validate(raw);if(!checked.valid)return checked;const s=checked.value as unknown as RuntimeShutdownSnapshot;
  if(!this.keys(s,["schemaVersion","runtimeId","scope","stage","activeExecutions","pendingOperationRefs","proofRef","retainedResourceIds","atEpochMs"])||s.schemaVersion!==1||!this.idValue(s.runtimeId)||!this.scope(s.scope)||!["draining","quiescent"].includes(s.stage)||!this.time(s.atEpochMs)||!Array.isArray(s.activeExecutions)||s.activeExecutions.length>64||!this.refs(s.pendingOperationRefs,100)||!this.ids(s.retainedResourceIds,32))return this.invalid();
  if(s.stage==="quiescent"?(!this.ref(s.proofRef)||s.activeExecutions.length!==0):s.proofRef!==null)return this.invalid();
  const seen=new Set<string>();for(const e of s.activeExecutions){if(!this.keys(e,["identity","startedAtEpochMs"])||!this.time(e.startedAtEpochMs)||e.startedAtEpochMs>s.atEpochMs||e.identity===null||typeof e.identity!=="object"||!Object.keys(e.identity).every(k=>["operationId","runId","stepRunId","sessionId","parentOperationId"].includes(k))||!this.idValue(e.identity.operationId)||!Object.values(e.identity).every(v=>this.idValue(v))||seen.has(e.identity.operationId))return this.invalid();seen.add(e.identity.operationId);}
  if(new TextEncoder().encode(JSON.stringify(checked.value)).byteLength>65536)return this.invalid();return {valid:true,value:s};
 }
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));}
 private idValue(v:unknown):v is string{return typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);}
 private ref(v:unknown):v is string{return typeof v==="string"&&v.trim().length>0&&v.length<=256;}
 private ids(v:unknown,max:number):boolean{return Array.isArray(v)&&v.length<=max&&v.every(x=>this.idValue(x))&&new Set(v).size===v.length;}
 private refs(v:unknown,max:number):boolean{return Array.isArray(v)&&v.length<=max&&v.every(x=>this.ref(x))&&new Set(v).size===v.length;}
 private time(v:unknown):v is number{return Number.isSafeInteger(v)&&(v as number)>=0;}
 private scope(v:unknown):boolean{if(v===null||typeof v!=="object")return false;const s=v as Record<string,unknown>;return this.keys(s,s.workspaceId===undefined?["scopeId","projectId"]:["scopeId","projectId","workspaceId"])&&this.idValue(s.scopeId)&&this.idValue(s.projectId)&&(s.workspaceId===undefined||this.idValue(s.workspaceId));}
 private invalid():ValidationResult<RuntimeShutdownSnapshot>{return {valid:false,issues:[{path:[],code:"RUNTIME_SHUTDOWN_SNAPSHOT_INVALID",message:"Invalid bounded shutdown snapshot."}]};}
}
```

### `index.ts`

Append these supported lifecycle contracts/classes to the existing API. Example/test entry points remain separate.

```typescript
export * from "./errors/RuntimeLifecycleError";
export * from "./errors/RuntimeAdmissionError";
export * from "./runtime/RuntimeOptions";
export * from "./runtime/RuntimeConfiguration";
export * from "./runtime/RuntimeControl";
export * from "./runtime/RuntimeControlScope";
export * from "./runtime/IRuntimeResourceFactory";
export * from "./runtime/IRuntimeResourceBinding";
export * from "./runtime/OwnedRuntimeResource";
export * from "./runtime/BorrowedRuntimeResource";
export * from "./runtime/RuntimeReleaseOutcome";
export * from "./runtime/RuntimeResourcePlan";
export * from "./runtime/IRuntimeInitializer";
export * from "./runtime/IRuntimeReadinessCheck";
export * from "./runtime/RuntimeStartupOutcome";
export * from "./runtime/RuntimeStartupCoordinator";
export * from "./runtime/RuntimeAdmissionGate";
export * from "./runtime/ActiveRuntimeExecution";
export * from "./runtime/RuntimeExecutionRegistry";
export * from "./runtime/IRuntimeFinalizer";
export * from "./runtime/IRuntimeQuiescenceLease";
export * from "./runtime/IRuntimeQuiescenceBarrier";
export * from "./runtime/RuntimeShutdownSnapshot";
export * from "./runtime/IRuntimeRecoveryWriter";
export * from "./runtime/ArtifactRuntimeRecoveryWriter";
export * from "./runtime/RuntimeShutdownOutcome";
export * from "./runtime/RuntimeShutdownCoordinator";
export * from "./runtime/FrameworkRuntime";
export * from "./runtime/RuntimeShutdownSnapshotContract";
```

