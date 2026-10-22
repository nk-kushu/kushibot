# 24. Cancellation, Checkpoints, and Recovery

## What We Implement Here

Implement durable cancellation requests, immutable checkpoints and explicit recovery of an interrupted workflow. Preserve collected work, original operation identities, pending effects and usage. Resume only after a host barrier proves old workers and writes are stopped, authoritative receipts resolve uncertainty, and original task controls still allow work. Reuse prepared input or a saved candidate without replaying a dispatched executor.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `errors/ExecutionRecoveryError.ts` | `class ExecutionRecoveryError extends Error` |
| `workflows/recovery/OperationReconciliation.ts` | `type OperationReconciliation` |
| `workflows/recovery/WorkflowRecoveryRecord.ts` | `type WorkflowRecoveryRecord` |
| `workflows/recovery/IRecoveryLease.ts` | `interface IRecoveryLease` |
| `workflows/recovery/IRecoveryBarrier.ts` | `interface IRecoveryBarrier` |
| `workflows/recovery/RunAbortRegistry.ts` | `class RunAbortRegistry` |
| `workflows/recovery/WorkflowCancellationService.ts` | `class WorkflowCancellationService` |
| `workflows/recovery/RecoveryObservation.ts` | `type RecoveryObservation<T>` |
| `workflows/recovery/IAttemptRecoverySource.ts` | `interface IAttemptRecoverySource` |
| `workflows/recovery/IEffectRecoverySource.ts` | `interface IEffectRecoverySource` |
| `workflows/recovery/IUsageRecoverySource.ts` | `interface IUsageRecoverySource` |
| `workflows/recovery/RecoveryEvidenceStore.ts` | `class RecoveryEvidenceStore` |
| `workflows/recovery/ICheckpointParticipant.ts` | `interface ICheckpointParticipant` |
| `workflows/recovery/ExecutionCheckpointManifest.ts` | `type ExecutionCheckpointManifest` |
| `workflows/recovery/WorkflowRecoveryOutcome.ts` | `type WorkflowRecoveryOutcome` |
| `domain/lifecycle/ExecutionLifecycle.ts` | `class ExecutionLifecycle` |
| `workflows/StepRun.ts` | `class StepRun` |
| `workflows/recovery/RecoveryFence.ts` | `type RecoveryFence` |
| `workflows/WorkflowRunSnapshot.ts` | `type WorkflowRunSnapshot` |
| `workflows/WorkflowRun.ts` | `class WorkflowRun` |
| `workflows/WorkflowRunSnapshotContract.ts` | `class WorkflowRunSnapshotContract` |
| `workflows/StepRunner.ts` | `class StepRunner` |
| `workflows/WorkflowEngine.ts` | `class WorkflowEngine` |
| `workflows/recovery/WorkflowRecoverySchemaMigrator.ts` | `class WorkflowRecoverySchemaMigrator` |
| `workflows/recovery/ExecutionCheckpointStore.ts` | `class ExecutionCheckpointStore` |
| `workflows/recovery/WorkflowCheckpointCoordinator.ts` | `class WorkflowCheckpointCoordinator` |
| `workflows/recovery/WorkflowRecoveryCoordinator.ts` | `class WorkflowRecoveryCoordinator` |
| `examples/workflows/recoverLoginWorkflowExample.ts` | `function recoverLoginWorkflowExample` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [01](01-scope-and-implementation-roadmap.md) and [02](02-package-structure-and-oop-conventions.md) for general OOP, file layout and writing rules. Each named class/interface/type has its own file; interface names start with `I`. The code below replaces the listed earlier files and adds the recovery files; it is one cumulative implementation, not parallel versions.
- Cancellation is a durable request before local abort notification. An abort signal, timeout or checkpoint does not prove model calls, children, processes or file writes finished. Editing remains sequential by default; recovery cannot steal an active workspace gate.
- `IRecoveryBarrier` is a required trusted host adapter. Its lease excludes all old workers, callbacks, descendants and writes until released, and binds the exact observed owner/run/scope. Supply real process/workspace coordination; a timestamp-only or no-op implementation is invalid. Unknown proof blocks progress with work retained.
- Recovery uses a fresh administrative context so cancellation cleanup can run after the task signal aborted. It never clears the durable task cancellation flag, extends its deadline, increases budgets or erases unknown usage. Administrative cancellation/deadline stops cleanup safely. Share one run-specific ledger (including descendant scopes); unrelated runs must not be mixed into it.
- Ordinary execution cannot take over an owner. Recovery first fences the root using its observed revision and owner. Short SQL transactions contain deterministic state changes; provider/file/process work happens outside them under the barrier. All old application versions must be stopped/fenced before migrating schema-v1 payloads. Retain backups; never recreate an existing row on decode failure.
- Checkpoint participants are versioned host adapters for sessions, notebooks, child journals and workspace state. Register the complete required set in the composition root. Immutable artifacts exclude secrets/live clients/controllers. Capture requires quiescence and stable rereads; participant mutations must respect the same barrier. Checkpoint artifacts are hints and audit evidence, never an instruction to roll SQL state or usage back.
- This phase resumes workflows at known executor boundaries. It does not promise arbitrary mid-model or mid-tool session continuation from a notebook alone. A dispatched attempt needs an authoritative saved outcome; otherwise it stays pending. Sources must verify scoped receipt bindings and original operation IDs, never ask an LLM to guess what happened or infer zero usage from silence.
- Save reconciliation evidence before changing pending/usage state. Keep raw historical outcomes and acceptance receipts unchanged; separate acknowledgements explain resolved effects. Actual usage settles the original reservation, including overage and provider-reported cached input tokens; recovery performs no new paid call, answer caching or unbudgeted summarization.
- A recovery receipt and owner release/final stop commit together. Retrying the same successful administrative command returns that receipt. Failures leave the last durable state and fence visible. A retry acquires a fresh barrier for the latest owner; it never reuses an expired lease. Prepared requests retain their original input/operation ID, saved candidates rerun only acceptance, and completed receipts remain historical evidence.
- Resume is explicit after a `recorded` / `resumed` recovery result: call the normal WorkflowEngine with a fresh task control context still constrained by the pinned root deadline and existing usage. A `blocked` result authorizes no executor retry. After cancellation/deadline, return the collected partial outcome once effects are reconciled; unknowns remain pending.

## TypeScript Code for Each File

### `errors/ExecutionRecoveryError.ts`

Reports invalid recovery bindings, unsafe checkpoint data or missing proof without exposing task/source/provider content.

```typescript
export class ExecutionRecoveryError extends Error{readonly code="EXECUTION_RECOVERY_INVALID";constructor(){super("Recovery binding, checkpoint, or evidence is invalid.");this.name="ExecutionRecoveryError";}}
```

### `workflows/recovery/OperationReconciliation.ts`

Acknowledges one previously pending effect with a saved authoritative proof reference, while retaining the original raw outcome/receipt unchanged.

```typescript
export type OperationReconciliation=Readonly<{operationRef:string;receiptRef:string}>;
```

### `workflows/recovery/WorkflowRecoveryRecord.ts`

Is a durable idempotent recovery command receipt committed together with owner release or final stopping. Its locator resolves from the run aggregate, not a claimed external artifact write.

```typescript
export type WorkflowRecoveryRecord=Readonly<{commandId:string;receiptRef:string;proofRef:string;action:"resumed"|"stopped";revision:number}>;
```

### `workflows/recovery/IRecoveryLease.ts`

Represents a host-held exclusive recovery barrier. The host must stop/fence old workers, descendants, late callbacks and file writers; timeout, AbortSignal or an expired timestamp alone proves none of this.

```typescript
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
export interface IRecoveryLease{readonly runId:string;readonly scope:ExecutionScopeRef;readonly previousOwnerToken:string|null;readonly proofRef:string;assertHeld():Promise<boolean>;release():Promise<void>;}
```

### `workflows/recovery/IRecoveryBarrier.ts`

Acquires the trusted runtime barrier for the exact observed owner/run. Missing proof returns null. Implementations coordinate actual process/tool/workspace lifetime and cannot steal a live editing gate by elapsed time.

```typescript
import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { IRecoveryLease } from "./IRecoveryLease";
export interface IRecoveryBarrier{acquire(run:WorkflowRunSnapshot,context:IExecutionContext):Promise<IRecoveryLease|null>;}
```

### `workflows/recovery/RunAbortRegistry.ts`

Tracks live controllers owned by this process and fans out an abort request. Durable cancellation remains authoritative even when no local controller is registered.

```typescript
import { ExecutionRecoveryError } from "../../errors/ExecutionRecoveryError";
export class RunAbortRegistry{
 private readonly controllers=new Map<string,Set<AbortController>>();
 register(runId:string,controller:AbortController):()=>void{if(!/^[A-Za-z0-9_.:-]{1,128}$/.test(runId))throw new ExecutionRecoveryError();const values=this.controllers.get(runId)??new Set<AbortController>();values.add(controller);this.controllers.set(runId,values);return ()=>{values.delete(controller);if(values.size===0)this.controllers.delete(runId);};}
 abort(runId:string):void{for(const controller of this.controllers.get(runId)??[])controller.abort();}
}
```

### `workflows/recovery/WorkflowCancellationService.ts`

Persists the cancellation request before notifying local work. It does not claim effects stopped, clear usage, release file gates or mark a pending run terminal.

```typescript
import type { IWorkflowRunStore } from "../IWorkflowRunStore";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import { RunAbortRegistry } from "./RunAbortRegistry";
import { canonicalWorkflowValue as same } from "../canonicalWorkflowValue";
import { ExecutionRecoveryError } from "../../errors/ExecutionRecoveryError";
export class WorkflowCancellationService{
 constructor(private readonly store:IWorkflowRunStore,private readonly aborts:RunAbortRegistry){}
 async request(context:IExecutionContext):Promise<Readonly<{status:"requested"|"already-terminal";runId:string;pendingOperationRefs:readonly string[]}>>{const snapshot=await this.store.read();if(context.identity.runId!==snapshot.runId||same(context.scope)!==same(snapshot.scope))throw new ExecutionRecoveryError();if(snapshot.outcome!==null)return {status:"already-terminal",runId:snapshot.runId,pendingOperationRefs:[]};await this.store.mutate(run=>run.requestDurableCancellation());this.aborts.abort(snapshot.runId);const saved=await this.store.read();return {status:"requested",runId:saved.runId,pendingOperationRefs:saved.lifecycle.pendingOperationRefs};}
}
```

### `workflows/recovery/RecoveryObservation.ts`

Supplies a known value only with durable scoped evidence references. Unknown stays explicit; no model opinion or missing receipt can be interpreted as proof of zero usage/no effect.

```typescript
export type RecoveryObservation<T>=Readonly<{status:"known";value:T;evidenceRefs:readonly string[]}>|Readonly<{status:"unknown"}>;
```

### `workflows/recovery/IAttemptRecoverySource.ts`

Reads an exact saved executor outcome from authorized session/tool/operation receipts. For an interrupted model/tool loop without such a known outcome, return unknown rather than restarting it.

```typescript
import type { WorkflowStepAttempt } from "../WorkflowStepAttempt";
import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { RecoveryObservation } from "./RecoveryObservation";
export interface IAttemptRecoverySource{read(attempt:WorkflowStepAttempt,run:WorkflowRunSnapshot,context:IExecutionContext):Promise<RecoveryObservation<ExecutionOutcome<JsonValue>>>;}
```

### `workflows/recovery/IEffectRecoverySource.ts`

Proves an exact pending effect has reached a known settled state, including actual file/process/child lifetime. It does not silently declare a failed effect successful; the original partial outcome remains.

```typescript
import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { RecoveryObservation } from "./RecoveryObservation";
export interface IEffectRecoverySource{read(operationRef:string,run:WorkflowRunSnapshot,context:IExecutionContext):Promise<RecoveryObservation<Readonly<{settled:true}>>>;}
```

### `workflows/recovery/IUsageRecoverySource.ts`

Obtains actual counters from the original provider/tool/budget receipts for one reserved/unknown operation. Cached tokens remain normal total input usage; absence of a response never means zero charge.

```typescript
import type { BudgetReservation } from "../../usage/BudgetReservation";
import type { UsageAmounts } from "../../usage/UsageAmounts";
import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { RecoveryObservation } from "./RecoveryObservation";
export interface IUsageRecoverySource{read(reservation:BudgetReservation,run:WorkflowRunSnapshot,context:IExecutionContext):Promise<RecoveryObservation<UsageAmounts>>;}
```

### `workflows/recovery/RecoveryEvidenceStore.ts`

Writes normalized reconciliation facts before settling usage or acknowledging effects. A content-derived idempotency key avoids changing evidence under one key on recovery retries; underlying scoped artifact access/retention remains mandatory.

```typescript
import type { IArtifactWriter } from "../../artifacts/IArtifactWriter";
import type { IArtifactDigest } from "../../artifacts/IArtifactDigest";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import { JsonValueContract } from "../../persistence/JsonValueContract";
import { ExecutionRecoveryError } from "../../errors/ExecutionRecoveryError";
export class RecoveryEvidenceStore{
 constructor(private readonly writer:IArtifactWriter,private readonly digest:IArtifactDigest,private readonly json:JsonValueContract){}
 async save(runId:string,operationRef:string,value:unknown,evidenceRefs:readonly string[],signal:AbortSignal):Promise<string>{if(evidenceRefs.length<1||evidenceRefs.length>16||evidenceRefs.some(ref=>typeof ref!=="string"||!ref||ref.length>256))throw new ExecutionRecoveryError();const checked=await this.json.validate({schemaVersion:1,runId,operationRef,value,evidenceRefs:[...new Set(evidenceRefs)].sort()});if(!checked.valid)throw new ExecutionRecoveryError();const bytes=new TextEncoder().encode(JSON.stringify(checked.value));if(bytes.byteLength>65536)throw new ExecutionRecoveryError();const digest=await this.digest.hash(bytes);const ref=await this.writer.write({name:"recovery-evidence",kind:"recovery-evidence",mediaType:"application/json",schemaId:"recovery-evidence",schemaVersion:"1",sourceRefs:[...evidenceRefs],idempotencyKey:"recovery-evidence:"+digest,expiresAtEpochMs:null,data:bytes},signal);return "artifact:"+ref.artifactId;}
}
```

### `workflows/recovery/ICheckpointParticipant.ts`

Captures and restores one versioned session/notebook/sub-agent/workspace component behind the barrier. Restore constructs validated runtime services from current authoritative records and checkpoint hints; it performs no paid call, effect replay or rollback to an older view.

```typescript
import type { RegistrationRef } from "../../contracts/RegistrationRef";
import type { ArtifactRef } from "../../artifacts/ArtifactRef";
import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
export interface ICheckpointParticipant{readonly registration:RegistrationRef;capture(run:WorkflowRunSnapshot,context:IExecutionContext):Promise<ArtifactRef>;restore(reference:ArtifactRef,run:WorkflowRunSnapshot,context:IExecutionContext):Promise<boolean>;}
```

### `workflows/recovery/ExecutionCheckpointManifest.ts`

References separately validated run/usage/participant artifacts instead of pretending one giant snapshot is a transaction across independent stores. The held barrier and unchanged rereads establish the capture boundary.

```typescript
import type { ArtifactRef } from "../../artifacts/ArtifactRef";
import type { RegistrationRef } from "../../contracts/RegistrationRef";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
export type ExecutionCheckpointManifest=Readonly<{schemaVersion:1;checkpointId:string;runId:string;scope:ExecutionScopeRef;runRevision:number;proofRef:string;run:ArtifactRef;usage:ArtifactRef;participants:readonly Readonly<{registration:RegistrationRef;reference:ArtifactRef}>[]}>;
```

### `workflows/recovery/WorkflowRecoveryOutcome.ts`

Distinguishes a committed resume/stop receipt from a safe block. A recovery request never reports resumed merely because artifacts loaded or an abort signal fired.

```typescript
import type { WorkflowRecoveryRecord } from "./WorkflowRecoveryRecord";
export type WorkflowRecoveryOutcome=Readonly<{status:"recorded";record:WorkflowRecoveryRecord}>|Readonly<{status:"blocked";code:string;pendingOperationRefs:readonly string[]}>;
```

### `domain/lifecycle/ExecutionLifecycle.ts`

Replace the earlier class with this compatible lifecycle extension: retaining evidence of existing pending work is distinct from admitting new work, and checkpoint evidence can be attached without falsely changing status.

```typescript
import { LifecycleDefinition } from "./LifecycleDefinition";
import { LifecycleSnapshotContract } from "./LifecycleSnapshotContract";
import type { LifecycleSnapshot } from "./LifecycleSnapshot";
import type { LifecycleStatus } from "./LifecycleStatus";
import type { LifecycleEvidence } from "./LifecycleEvidence";
import { InvalidLifecycleTransitionError } from "../../errors/InvalidLifecycleTransitionError";
import { InvalidLifecycleSnapshotError } from "../../errors/InvalidLifecycleSnapshotError";

export class ExecutionLifecycle {
  private constructor(
    private readonly definition: LifecycleDefinition,
    private state: LifecycleSnapshot,
  ) {}

  static create(definition: LifecycleDefinition, executionId: string): ExecutionLifecycle {
    if (typeof executionId !== "string" || !executionId.trim()) {
      throw new InvalidLifecycleSnapshotError("Expected an execution identifier.");
    }
    return new ExecutionLifecycle(definition, Object.freeze({
      schemaVersion: 1, kind: definition.kind, definitionVersion: definition.version,
      executionId, status: definition.initial, revision: 0, cancellationRequested: false,
      pendingOperationRefs: Object.freeze([]), evidence: Object.freeze({}),
    }));
  }

  static async restore(definition: LifecycleDefinition, data: unknown): Promise<ExecutionLifecycle> {
    const checked = await new LifecycleSnapshotContract(definition).validate(data);
    if (!checked.valid) throw new InvalidLifecycleSnapshotError("Snapshot restoration rejected.");
    return new ExecutionLifecycle(definition, checked.value);
  }

  snapshot(): LifecycleSnapshot { return this.state; }

  transition(to: LifecycleStatus, evidence: LifecycleEvidence = {}): void {
    this.move(to, evidence, this.state.cancellationRequested);
  }

  requestCancellation(): void {
    if (this.state.cancellationRequested) return;
    this.move("stopping", {}, true);
  }

  recordPendingOperation(reference: string): void {
    if (this.state.status !== "active" || this.state.cancellationRequested || !this.reference(reference)) {
      throw new InvalidLifecycleTransitionError("Cannot admit pending work in this state.");
    }
    if (this.state.pendingOperationRefs.includes(reference)) return;
    this.commit({ ...this.state, pendingOperationRefs: Object.freeze([...this.state.pendingOperationRefs, reference]) });
  }

  retainPendingOperation(reference:string):void{
    if(!["active","stopping","interrupted","recovering"].includes(this.state.status)||!this.reference(reference))throw new InvalidLifecycleTransitionError("Cannot retain pending evidence in this state.");
    if(!this.state.pendingOperationRefs.includes(reference))this.commit({...this.state,pendingOperationRefs:Object.freeze([...this.state.pendingOperationRefs,reference])});
  }
  attachCheckpoint(reference:string):void{if(!this.reference(reference))throw new InvalidLifecycleTransitionError("Invalid checkpoint reference.");this.commit({...this.state,evidence:Object.freeze({...this.state.evidence,checkpointRef:reference})});}
  recordReconciledOperation(reference: string): void {
    if (!this.state.pendingOperationRefs.includes(reference)) {
      throw new InvalidLifecycleTransitionError("Unknown pending operation.");
    }
    // Only the owning coordinator may call this after establishing actual effects/usage.
    this.commit({ ...this.state, pendingOperationRefs: Object.freeze(
      this.state.pendingOperationRefs.filter(ref => ref !== reference),
    ) });
  }

  private move(to: LifecycleStatus, evidence: LifecycleEvidence, cancellationRequested: boolean): void {
    if (!this.definition.allows(this.state.status, to)) {
      throw new InvalidLifecycleTransitionError("Transition is not allowed by this lifecycle.");
    }
    if (Object.keys(evidence).some(key => !["acceptedResultRef", "checkpointRef", "proposalRef"].includes(key)) ||
        Object.values(evidence).some(value => !this.reference(value))) {
      throw new InvalidLifecycleTransitionError("Invalid evidence reference.");
    }
    const merged = Object.freeze({ ...this.state.evidence, ...evidence });
    if ((this.definition.isTerminal(to) && this.state.pendingOperationRefs.length > 0) ||
        (["completed", "paused", "waiting-for-approval", "retry-wait"].includes(to) && this.state.pendingOperationRefs.length > 0) ||
        (to === "active" && this.state.status === "recovering" && this.state.pendingOperationRefs.length > 0) ||
        (to === "completed" && !merged.acceptedResultRef) ||
        (to === "paused" && !merged.checkpointRef) ||
        (to === "waiting-for-approval" && !merged.proposalRef) ||
        (to === "cancelled" && !cancellationRequested) ||
        (cancellationRequested && !["stopping", "recovering", "cancelled", "failed"].includes(to))) {
      throw new InvalidLifecycleTransitionError("Required lifecycle evidence or reconciliation is missing.");
    }
    this.commit({ ...this.state, status: to, evidence: merged, cancellationRequested });
  }

  private commit(next: LifecycleSnapshot): void {
    if (!Number.isSafeInteger(this.state.revision + 1)) {
      throw new InvalidLifecycleTransitionError("Lifecycle revision exhausted.");
    }
    this.state = Object.freeze({ ...next, revision: this.state.revision + 1 });
  }

  private reference(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }
}
```

### `workflows/StepRun.ts`

Replace the earlier class with cancellation and recovery transitions. Late known outcomes can still close a cancelled execution, while new dispatch remains forbidden and unresolved work stays nonterminal.

```typescript
import type { StepRunSnapshot } from "./StepRunSnapshot";
import type { StepAttemptReceipt } from "./StepAttemptReceipt";
import { ExecutionLifecycle } from "../domain/lifecycle/ExecutionLifecycle";
import { stepRunLifecycle } from "../domain/lifecycle/stepRunLifecycle";
import { WorkflowRunError } from "../errors/WorkflowRunError";
export class StepRun{
  private constructor(private state:StepRunSnapshot,private readonly lifecycle:ExecutionLifecycle){}
  static create(stepId:string,stepRunId:string):StepRun{const lifecycle=ExecutionLifecycle.create(stepRunLifecycle,stepRunId);return new StepRun(Object.freeze({stepId,stepRunId,invalidated:false,attemptId:null,lifecycle:lifecycle.snapshot()}),lifecycle);}
  static async restore(state:StepRunSnapshot):Promise<StepRun>{const lifecycle=await ExecutionLifecycle.restore(stepRunLifecycle,state.lifecycle);if(state.stepRunId!==state.lifecycle.executionId)throw new WorkflowRunError();return new StepRun(state,lifecycle);}
  snapshot():StepRunSnapshot{return Object.freeze({...this.state,lifecycle:this.lifecycle.snapshot()});}
  start(attemptId:string):void{if(this.state.invalidated||
        this.state.attemptId!==null)throw new WorkflowRunError();this.lifecycle.transition("active");this.state=Object.freeze({...this.state,attemptId});}
  pending(ref:string):void{this.lifecycle.recordPendingOperation(ref);}
  reconciled(ref:string):void{this.lifecycle.recordReconciledOperation(ref);}
  retain(ref:string):void{this.lifecycle.retainPendingOperation(ref);}
  requestCancellation():void{if(!["completed","failed","stopped","cancelled"].includes(this.lifecycle.snapshot().status)&&!this.lifecycle.snapshot().cancellationRequested)this.lifecycle.requestCancellation();}
  enterRecovery():void{const status=this.lifecycle.snapshot().status;if(["created","completed","failed","stopped","cancelled"].includes(status))return;if(status==="active")this.lifecycle.transition("interrupted");if(this.lifecycle.snapshot().status!=="recovering")this.lifecycle.transition("recovering");}
  readyAfterRecovery(receipt:StepAttemptReceipt|null,stop=false):void{if(["created","completed","failed","stopped","cancelled"].includes(this.lifecycle.snapshot().status))return;if(this.lifecycle.snapshot().pendingOperationRefs.length>0)throw new WorkflowRunError();if(receipt!==null){this.close(receipt);return;}if(stop){if(this.lifecycle.snapshot().cancellationRequested){this.lifecycle.transition("stopping");this.lifecycle.transition("cancelled");}else this.lifecycle.transition("stopped");return;}if(this.lifecycle.snapshot().cancellationRequested)throw new WorkflowRunError();this.lifecycle.transition("active");}
  close(receipt:StepAttemptReceipt):void{
    if(receipt.attemptId!==this.state.attemptId)throw new WorkflowRunError();
    if(this.lifecycle.snapshot().pendingOperationRefs.length>0){if(this.lifecycle.snapshot().status==="active")this.lifecycle.transition("interrupted");return;}
    if(this.lifecycle.snapshot().cancellationRequested){if(this.lifecycle.snapshot().status!=="stopping")this.lifecycle.transition("stopping");this.lifecycle.transition("cancelled");return;}
    if(this.lifecycle.snapshot().status==="recovering")this.lifecycle.transition("active");
    if(receipt.acceptance.status==="accepted"){this.lifecycle.transition("completed",{acceptedResultRef:receipt.receiptRef});return;}
    if(receipt.outcome.status==="failed"){this.lifecycle.transition("failed");return;}
    if(receipt.outcome.status==="stopped"&&receipt.outcome.reason.code==="cancelled"){this.lifecycle.requestCancellation();this.lifecycle.transition("cancelled");return;}
    this.lifecycle.transition("stopped");
  }
  invalidate():void{if(this.lifecycle.snapshot().pendingOperationRefs.length>0)throw new WorkflowRunError();this.state=Object.freeze({...this.state,invalidated:true});}
}
```

### `workflows/recovery/RecoveryFence.ts`

Persists the host’s quiescence proof and recovery owner before any reconciliation. Normal engine/step owners are fenced until a committed recovery receipt releases the run.

```typescript
export type RecoveryFence=Readonly<{ownerToken:string;proofRef:string}>;
```

### `workflows/WorkflowRunSnapshot.ts`

Replace schema v1 with schema v2, adding explicit reconciliation evidence, recovery fencing and idempotent recovery command receipts. Migrate persisted v1 rows only through the barrier-protected migrator below.

```typescript
import type { OperationReconciliation } from "./recovery/OperationReconciliation";
import type { WorkflowRecoveryRecord } from "./recovery/WorkflowRecoveryRecord";
import type { RecoveryFence } from "./recovery/RecoveryFence";
import type { WorkflowCompletionDecision } from "./WorkflowCompletionDecision";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import type { RegistrationRef } from "../contracts/RegistrationRef";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { LifecycleSnapshot } from "../domain/lifecycle/LifecycleSnapshot";
import type { WorkflowDefinition } from "./WorkflowDefinition";
import type { StepRunSnapshot } from "./StepRunSnapshot";
import type { WorkflowStepAttempt } from "./WorkflowStepAttempt";
import type { AcceptedStepResult } from "./AcceptedStepResult";
import type { WorkflowTransitionRecord } from "./WorkflowTransitionRecord";
import type { WorkflowTransitionPlan } from "./WorkflowTransitionPlan";
import type { WorkflowResult } from "./WorkflowResult";
export type WorkflowRunSnapshot=Readonly<{
  schemaVersion:2;revision:number;dependencyRevision:number;runId:string;scope:ExecutionScopeRef;
  definition:WorkflowDefinition;request:JsonValue;completionPolicy:RegistrationRef;budgetScopeId:string;deadlineEpochMs:number|null;
  reconciliations:readonly OperationReconciliation[];recoveries:readonly WorkflowRecoveryRecord[];recoveryFence:RecoveryFence|null;
  lifecycle:LifecycleSnapshot;engineOwner:Readonly<{commandId:string;ownerToken:string}>|null;
  steps:readonly StepRunSnapshot[];attempts:readonly WorkflowStepAttempt[];accepted:readonly AcceptedStepResult[];
  transitions:readonly WorkflowTransitionRecord[];transitionPlan:WorkflowTransitionPlan|null;completionDecision:WorkflowCompletionDecision|null;outcome:ExecutionOutcome<WorkflowResult>|null;
}>;
```

### `workflows/WorkflowRun.ts`

Replace the earlier aggregate with schema-v2 cancellation/recovery operations. Original outcomes remain immutable; reconciliation acknowledgements separately account for resolved historical pending references. A recorded recovery receipt fences owner release.

```typescript
import type { WorkflowRecoveryRecord } from "./recovery/WorkflowRecoveryRecord";
import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot";
import type { WorkflowDefinition } from "./WorkflowDefinition";
import type { WorkflowStepAttempt } from "./WorkflowStepAttempt";
import type { StepDefinition } from "./StepDefinition";
import type { StepAttemptClaim } from "./StepAttemptClaim";
import type { StepAttemptClaimOutcome } from "./StepAttemptClaimOutcome";
import type { StepAttemptReceipt } from "./StepAttemptReceipt";
import type { StepResultAcceptance } from "./StepResultAcceptance";
import type { StepInputPolicyInput } from "./StepInputPolicyInput";
import type { WorkflowTransitionPlan } from "./WorkflowTransitionPlan";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import { ExecutionLifecycle } from "../domain/lifecycle/ExecutionLifecycle";
import { workflowRunLifecycle } from "../domain/lifecycle/workflowRunLifecycle";
import { StepRun } from "./StepRun";
import { canonicalWorkflowValue as same } from "./canonicalWorkflowValue";
import { collectWorkflowPartial } from "./collectWorkflowPartial";
import { WorkflowRunError } from "../errors/WorkflowRunError";
export class WorkflowRun{
  private readonly steps=new Map<string,StepRun>();
  private constructor(private state:WorkflowRunSnapshot,private readonly lifecycle:ExecutionLifecycle){}
  static create(input:Pick<WorkflowRunSnapshot,"runId"|"scope"|"definition"|"request"|"completionPolicy"|"budgetScopeId"|"deadlineEpochMs">):WorkflowRunSnapshot{
    return Object.freeze({...input,schemaVersion:2 as const,revision:0,dependencyRevision:0,reconciliations:Object.freeze([]),recoveries:Object.freeze([]),recoveryFence:null,lifecycle:ExecutionLifecycle.create(workflowRunLifecycle,input.runId).snapshot(),engineOwner:null,steps:Object.freeze([]),attempts:Object.freeze([]),accepted:Object.freeze([]),transitions:Object.freeze([]),transitionPlan:null,completionDecision:null,outcome:null});
  }
  static async restore(snapshot:WorkflowRunSnapshot):Promise<WorkflowRun>{const run=new WorkflowRun(snapshot,await ExecutionLifecycle.restore(workflowRunLifecycle,snapshot.lifecycle));for(const state of snapshot.steps)run.steps.set(state.stepRunId,await StepRun.restore(state));run.audit();return run;}
  snapshot():WorkflowRunSnapshot{return Object.freeze({...this.state,lifecycle:this.lifecycle.snapshot(),steps:Object.freeze([...this.steps.values()].map(step=>step.snapshot()))});}
  acquire(commandId:string,ownerToken:string):boolean{if(this.state.outcome!==null||
        this.state.engineOwner!==null)return false;if(this.lifecycle.snapshot().status!=="active")this.lifecycle.transition("active");this.state=Object.freeze({...this.state,engineOwner:Object.freeze({commandId,ownerToken})});this.bump();return true;}
  current(view:StepInputPolicyInput):boolean{const step=this.state.definition.steps.find(item=>item.id===view.stepId);return step!==undefined&&same(view)===same(this.view(step.id));}
  view(stepId:string):StepInputPolicyInput{const step=this.definitionStep(stepId);return Object.freeze({workflow:Object.freeze({id:this.state.definition.id,version:this.state.definition.version}),stepId,viewRef:"workflow-view:"+this.state.runId+":"+this.state.dependencyRevision,request:this.state.request,dependencies:Object.freeze(step.dependencies.map(id=>this.state.accepted.find(item=>item.stepId===id)).filter((item):item is NonNullable<typeof item>=>item!==undefined))});}
  ready():StepDefinition|null{return this.state.definition.steps.find(step=>!this.state.accepted.some(item=>item.stepId===step.id)&&step.dependencies.every(id=>this.state.accepted.some(item=>item.stepId===id))&&!this.activeStep(step.id)?.snapshot().attemptId)??null;}
  openStep(owner:string,stepId:string,stepRunId:string):string|null{this.owner(owner);const step=this.definitionStep(stepId);if(this.ready()?.id!==stepId)throw new WorkflowRunError();if(this.state.attempts.length>=this.state.definition.maxTotalAttempts||
        this.state.attempts.filter(item=>item.claim.step.id===stepId).length>=step.maxAttempts)return null;const old=this.activeStep(stepId);if(old!==null)return old.snapshot().stepRunId;if(this.steps.has(stepRunId)||
        !this.id(stepRunId))throw new WorkflowRunError();this.steps.set(stepRunId,StepRun.create(stepId,stepRunId));this.bump();return stepRunId;}
  claim(owner:string,command:StepAttemptClaim):StepAttemptClaimOutcome{
    this.owner(owner);const old=this.state.attempts.find(item=>item.claim.commandId===command.commandId);
    if(old!==undefined){if(this.commandKey(old.claim)!==this.commandKey(command))throw new WorkflowRunError();return {status:"existing",outcome:old.receipt===null?{status:"pending",attemptId:old.claim.attemptId,pendingOperationRefs:[old.claim.operationId]}:{status:"recorded",receipt:old.receipt}};}
    if(this.state.transitionPlan!==null||
        this.lifecycle.snapshot().pendingOperationRefs.length>0||
        this.state.attempts.some(item=>item.receipt===null))return {status:"blocked",code:"WORKFLOW_OPERATION_PENDING"};
    const step=this.definitionStep(command.step.id),execution=this.activeStep(step.id);
    if(command.runId!==this.state.runId||
        same(command.scope)!==same(this.state.scope)||
        same(command.workflow)!==same({id:this.state.definition.id,version:this.state.definition.version})||
        same(command.step)!==same(step)||
        command.maxRunAttempts!==this.state.definition.maxTotalAttempts||
        !this.current(command.view)||
        execution===null||
        execution.snapshot().stepRunId!==command.stepRunId||
        execution.snapshot().attemptId!==null)throw new WorkflowRunError();
    if(this.state.accepted.some(item=>item.stepId===step.id)||
        step.dependencies.some(id=>!this.state.accepted.some(item=>item.stepId===id)))return {status:"blocked",code:"STEP_NOT_READY"};
    const attemptNumber=this.state.attempts.filter(item=>item.claim.step.id===step.id).length+1;if(attemptNumber>step.maxAttempts||
        this.state.attempts.length>=this.state.definition.maxTotalAttempts)return {status:"blocked",code:"WORKFLOW_ATTEMPT_LIMIT"};
    if([command.commandId,command.ownerToken,command.attemptId,command.operationId].some(value=>!this.id(value))||
        new Set([command.commandId,command.ownerToken,command.attemptId,command.operationId]).size!==4||
        this.state.attempts.some(item=>[item.claim.attemptId,item.claim.operationId,item.claim.ownerToken,item.claim.commandId].some(id=>[command.commandId,command.ownerToken,command.attemptId,command.operationId].includes(id))))throw new WorkflowRunError();
    execution.start(command.attemptId);this.state=Object.freeze({...this.state,attempts:Object.freeze([...this.state.attempts,Object.freeze({claim:command,attemptNumber,stage:"claimed" as const,input:null,outcome:null,receipt:null})])});this.bump();return {status:"admitted",attemptNumber};
  }
  prepare(owner:string,attemptId:string,token:string,input:JsonValue):void{const attempt=this.ownedAttempt(owner,attemptId,token);if(attempt.stage!=="claimed")throw new WorkflowRunError();this.replace({...attempt,input,stage:"prepared"});}
  dispatch(owner:string,attemptId:string,token:string):boolean{const attempt=this.ownedAttempt(owner,attemptId,token);if(attempt.stage!=="prepared")return false;this.lifecycle.recordPendingOperation(attempt.claim.operationId);this.steps.get(attempt.claim.stepRunId)!.pending(attempt.claim.operationId);this.replace({...attempt,stage:"dispatching"});return true;}
  record(owner:string,attemptId:string,token:string,outcome:ExecutionOutcome<JsonValue>):void{
    const attempt=this.ownedAttempt(owner,attemptId,token,true);if(attempt.outcome!==null){if(same(attempt.outcome)!==same(outcome))throw new WorkflowRunError();return;}
    if(attempt.stage!=="dispatching"&&outcome.status==="completed")throw new WorkflowRunError();const step=this.steps.get(attempt.claim.stepRunId)!;
    if(attempt.stage==="dispatching"){this.lifecycle.recordReconciledOperation(attempt.claim.operationId);step.reconciled(attempt.claim.operationId);}
    if(outcome.status!=="completed")for(const ref of outcome.pendingOperationRefs){this.lifecycle.retainPendingOperation(ref);step.retain(ref);}
    this.replace({...attempt,outcome,stage:"outcome"});
  }
  commit(owner:string,attemptId:string,token:string,acceptance:StepResultAcceptance,context:IExecutionContext,now:number):StepAttemptReceipt{
    const attempt=this.ownedAttempt(owner,attemptId,token,true);if(attempt.receipt!==null)return attempt.receipt;if(attempt.outcome===null)throw new WorkflowRunError();
    if(context.identity.runId!==this.state.runId||
        context.identity.stepRunId!==attempt.claim.stepRunId||
        context.identity.operationId!==attempt.claim.operationId||
        same(context.scope)!==same(this.state.scope))throw new WorkflowRunError();
    let decision=acceptance;if(decision.status==="accepted"&&(this.lifecycle.snapshot().cancellationRequested||context.signal.aborted||
        (context.deadlineEpochMs!==null&&now>=context.deadlineEpochMs)||
        (this.state.deadlineEpochMs!==null&&now>=this.state.deadlineEpochMs)||
        !this.current(attempt.claim.view)||
        this.lifecycle.snapshot().pendingOperationRefs.length>0))decision={status:"not-evaluated",code:"COMMIT_PRECONDITION_CHANGED",message:"Candidate retained; controls, dependencies, or pending effects prevent acceptance."};
    if(attempt.outcome.status!=="completed"&&decision.status!=="not-evaluated")throw new WorkflowRunError();
    const receipt:StepAttemptReceipt=Object.freeze({attemptId,stepRunId:attempt.claim.stepRunId,runId:this.state.runId,stepId:attempt.claim.step.id,attemptNumber:attempt.attemptNumber,workflow:attempt.claim.workflow,executor:attempt.claim.step.executor,viewRef:attempt.claim.view.viewRef,receiptRef:"step-receipt:"+attemptId,outcome:attempt.outcome,acceptance:decision});
    this.steps.get(attempt.claim.stepRunId)!.close(receipt);this.replace({...attempt,receipt,stage:"committed"});
    if(decision.status==="accepted"&&attempt.outcome.status==="completed"){this.state=Object.freeze({...this.state,accepted:Object.freeze([...this.state.accepted,Object.freeze({stepId:receipt.stepId,attemptId,receiptRef:receipt.receiptRef,result:attempt.outcome.result})]),dependencyRevision:this.state.dependencyRevision+1});this.bump();}return receipt;
  }
  unprocessed():StepAttemptReceipt|null{return this.state.attempts.find(attempt=>attempt.receipt!==null&&!this.state.transitions.some(record=>record.triggerAttemptId===attempt.claim.attemptId))?.receipt??null;}
  consume(owner:string,revision:number,triggerAttemptId:string):void{this.owner(owner);this.expected(revision);if(this.unprocessed()?.attemptId!==triggerAttemptId)throw new WorkflowRunError();this.state=Object.freeze({...this.state,transitions:Object.freeze([...this.state.transitions,Object.freeze({triggerAttemptId,transitionId:null,fixOperationId:null})])});this.bump();}
  stageCorrection(owner:string,revision:number,triggerAttemptId:string,transitionId:string,operationId:string):WorkflowTransitionPlan|null{
    this.owner(owner);this.expected(revision);const trigger=this.unprocessed(),transition=this.state.definition.transitions.find(item=>item.id===transitionId);
    if(trigger?.attemptId!==triggerAttemptId||
        transition===undefined||
        transition.fromStepId!==trigger.stepId||
        !this.affected(transition.toStepId).includes(trigger.stepId)||
        !this.state.attempts.some(item=>item.claim.step.id===transition.toStepId)||
        this.state.transitionPlan!==null||
        this.lifecycle.snapshot().pendingOperationRefs.length>0||
        !this.id(operationId))throw new WorkflowRunError();
    const affected=this.affected(transition.toStepId);if(this.state.transitions.filter(item=>item.transitionId===transitionId).length>=transition.maxTraversals||
        affected.some(id=>this.state.attempts.filter(attempt=>attempt.claim.step.id===id).length>=this.definitionStep(id).maxAttempts)||
        this.state.attempts.length+affected.length>this.state.definition.maxTotalAttempts)return null;
    const plan=Object.freeze({triggerAttemptId,transitionId,operationId});this.state=Object.freeze({...this.state,transitionPlan:plan});this.lifecycle.recordPendingOperation(operationId);this.bump();return plan;
  }
  applyCorrection(owner:string,plan:WorkflowTransitionPlan):void{
    this.owner(owner);if(same(this.state.transitionPlan)!==same(plan))throw new WorkflowRunError();const transition=this.state.definition.transitions.find(item=>item.id===plan.transitionId)!;const affected=this.affected(transition.toStepId);
    for(const step of this.steps.values())if(affected.includes(step.snapshot().stepId)&&!step.snapshot().invalidated)step.invalidate();
    this.lifecycle.recordReconciledOperation(plan.operationId);this.state=Object.freeze({...this.state,transitionPlan:null,accepted:Object.freeze(this.state.accepted.filter(item=>!affected.includes(item.stepId))),dependencyRevision:this.state.dependencyRevision+1,transitions:Object.freeze([...this.state.transitions,Object.freeze({triggerAttemptId:plan.triggerAttemptId,transitionId:plan.transitionId,fixOperationId:plan.operationId})])});this.bump();
  }
  denyCorrection(owner:string,plan:WorkflowTransitionPlan):void{this.owner(owner);if(same(this.state.transitionPlan)!==same(plan))throw new WorkflowRunError();this.lifecycle.recordReconciledOperation(plan.operationId);this.state=Object.freeze({...this.state,transitionPlan:null});this.bump();}
  complete(owner:string,revision:number):void{this.owner(owner);this.expected(revision);if(this.state.accepted.length!==this.state.definition.steps.length||
        this.unprocessed()!==null||
        this.lifecycle.snapshot().pendingOperationRefs.length>0)throw new WorkflowRunError();const result=Object.freeze({runId:this.state.runId,results:this.state.accepted});this.lifecycle.transition("completed",{acceptedResultRef:"workflow-result:"+this.state.runId});this.state=Object.freeze({...this.state,completionDecision:Object.freeze({accepted:true as const}),outcome:Object.freeze({status:"completed" as const,result})});this.bump();}
  stop(owner:string,reason:ExecutionStopReason):void{this.owner(owner);if(this.lifecycle.snapshot().pendingOperationRefs.length>0){if(reason.code==="cancelled")this.lifecycle.requestCancellation();else this.lifecycle.transition("interrupted");this.bump();return;}if(reason.code==="cancelled"){this.lifecycle.requestCancellation();this.lifecycle.transition("cancelled");}else this.lifecycle.transition("stopped");this.state=Object.freeze({...this.state,outcome:Object.freeze({status:"stopped" as const,reason,partial:collectWorkflowPartial(this.snapshot()),pendingOperationRefs:Object.freeze([])})});this.bump();}
  rejectCompletion(owner:string,revision:number,decision:Extract<import("./WorkflowCompletionDecision").WorkflowCompletionDecision,{accepted:false}>,control:ExecutionStopReason|null=null):void{this.owner(owner);this.expected(revision);this.state=Object.freeze({...this.state,completionDecision:decision});this.stop(owner,control??{code:"no-progress",message:decision.message});}
  fail(owner:string):void{this.owner(owner);if(this.lifecycle.snapshot().pendingOperationRefs.length>0)throw new WorkflowRunError();this.lifecycle.transition("failed");this.state=Object.freeze({...this.state,outcome:Object.freeze({status:"failed" as const,error:Object.freeze({code:"WORKFLOW_STEP_FAILED",message:"A step failed and no declared correction can advance it."}),partial:collectWorkflowPartial(this.snapshot()),pendingOperationRefs:Object.freeze([])})});this.bump();}
  interrupt(owner:string):void{this.owner(owner);this.lifecycle.transition("interrupted");this.bump();}

  requestDurableCancellation():void{if(this.state.outcome!==null)return;if(!this.lifecycle.snapshot().cancellationRequested)this.lifecycle.requestCancellation();for(const step of this.steps.values())if(!step.snapshot().invalidated)step.requestCancellation();this.bump();}
  fenceRecovery(revision:number,previousOwner:string|null,ownerToken:string,proofRef:string):void{
    this.expected(revision);if(this.state.outcome!==null||this.state.engineOwner?.ownerToken!==previousOwner&&!(this.state.engineOwner===null&&previousOwner===null)||!this.id(ownerToken)||typeof proofRef!=="string"||!proofRef||proofRef.length>256)throw new WorkflowRunError();
    if(this.lifecycle.snapshot().status==="created")this.lifecycle.transition("active");if(this.lifecycle.snapshot().status==="active")this.lifecycle.transition("interrupted");if(this.lifecycle.snapshot().status!=="recovering")this.lifecycle.transition("recovering");
    for(const step of this.steps.values())if(!step.snapshot().invalidated)step.enterRecovery();
    this.state=Object.freeze({...this.state,engineOwner:Object.freeze({commandId:ownerToken,ownerToken}),recoveryFence:Object.freeze({ownerToken,proofRef})});this.bump();
  }
  recoveryCheckpoint(owner:string,revision:number,reference:string):void{this.recoveryOwner(owner);this.expected(revision);this.lifecycle.attachCheckpoint(reference);this.bump();}
  recoverKnownOutcome(owner:string,attemptId:string,outcome:ExecutionOutcome<JsonValue>):void{
    this.recoveryOwner(owner);const attempt=this.state.attempts.find(item=>item.claim.attemptId===attemptId);if(attempt===undefined||attempt.stage!=="dispatching"||attempt.outcome!==null)throw new WorkflowRunError();const step=this.steps.get(attempt.claim.stepRunId)!;
    this.lifecycle.recordReconciledOperation(attempt.claim.operationId);step.reconciled(attempt.claim.operationId);
    if(outcome.status!=="completed")for(const ref of outcome.pendingOperationRefs){this.lifecycle.retainPendingOperation(ref);step.retain(ref);}
    this.replace({...attempt,outcome,stage:"outcome"});
  }
  acknowledgeEffect(owner:string,operationRef:string,receiptRef:string):void{
    this.recoveryOwner(owner);const old=this.state.reconciliations.find(record=>record.operationRef===operationRef);if(old!==undefined){if(old.receiptRef!==receiptRef)throw new WorkflowRunError();return;}
    if(!this.lifecycle.snapshot().pendingOperationRefs.includes(operationRef)||this.state.transitionPlan?.operationId===operationRef||this.state.attempts.some(attempt=>attempt.stage==="dispatching"&&attempt.claim.operationId===operationRef)||!receiptRef||receiptRef.length>256)throw new WorkflowRunError();
    this.lifecycle.recordReconciledOperation(operationRef);for(const step of this.steps.values())if(step.snapshot().lifecycle.pendingOperationRefs.includes(operationRef))step.reconciled(operationRef);
    this.state=Object.freeze({...this.state,reconciliations:Object.freeze([...this.state.reconciliations,Object.freeze({operationRef,receiptRef})])});this.bump();
  }
  recoverCorrection(owner:string,apply:boolean):void{
    this.recoveryOwner(owner);const plan=this.state.transitionPlan;if(plan===null)return;this.lifecycle.recordReconciledOperation(plan.operationId);
    if(apply){const transition=this.state.definition.transitions.find(item=>item.id===plan.transitionId)!;const affected=this.affected(transition.toStepId);for(const step of this.steps.values())if(!step.snapshot().invalidated&&affected.includes(step.snapshot().stepId))step.invalidate();this.state=Object.freeze({...this.state,accepted:Object.freeze(this.state.accepted.filter(item=>!affected.includes(item.stepId))),dependencyRevision:this.state.dependencyRevision+1,transitions:Object.freeze([...this.state.transitions,Object.freeze({triggerAttemptId:plan.triggerAttemptId,transitionId:plan.transitionId,fixOperationId:plan.operationId})])});}
    this.state=Object.freeze({...this.state,transitionPlan:null});this.bump();
  }
  finishRecovery(owner:string,commandId:string,resume:boolean,reason:ExecutionStopReason|null):WorkflowRecoveryRecord{
    this.recoveryOwner(owner);const old=this.state.recoveries.find(record=>record.commandId===commandId);if(old!==undefined)return old;
    if(this.lifecycle.snapshot().pendingOperationRefs.length>0||this.state.transitionPlan!==null||this.state.attempts.some(attempt=>attempt.stage==="dispatching"))throw new WorkflowRunError();
    if(resume&&(this.lifecycle.snapshot().cancellationRequested||reason!==null))throw new WorkflowRunError();
    if(!resume){const stop=reason??{code:"no-progress" as const,message:"Recovery retained collected work without resuming."};for(const attempt of [...this.state.attempts])if(attempt.receipt===null){const outcome=attempt.outcome??{status:"stopped" as const,reason:stop,partial:{summary:"Executor did not dispatch; prepared work is retained.",evidenceRefs:[],artifactRefs:[],unresolved:["Assignment remains incomplete."]},pendingOperationRefs:[]};const receipt:StepAttemptReceipt=Object.freeze({attemptId:attempt.claim.attemptId,stepRunId:attempt.claim.stepRunId,runId:this.state.runId,stepId:attempt.claim.step.id,attemptNumber:attempt.attemptNumber,workflow:attempt.claim.workflow,executor:attempt.claim.step.executor,viewRef:attempt.claim.view.viewRef,receiptRef:"step-receipt:"+attempt.claim.attemptId,outcome,acceptance:{status:"not-evaluated",code:"RECOVERY_STOPPED",message:"Recovered work retained without acceptance."}});this.replace({...attempt,outcome,receipt,stage:"committed"});}}
    for(const step of this.steps.values())if(!step.snapshot().invalidated){const attempt=this.state.attempts.find(item=>item.claim.attemptId===step.snapshot().attemptId);step.readyAfterRecovery(attempt?.receipt??null,!resume);}
    if(resume){this.lifecycle.transition("active");this.state=Object.freeze({...this.state,engineOwner:null});}
    else{const stop=reason??{code:"no-progress" as const,message:"Recovery retained collected work without resuming."};if(this.lifecycle.snapshot().cancellationRequested){this.lifecycle.transition("stopping");this.lifecycle.transition("cancelled");}else this.lifecycle.transition("stopped");this.state=Object.freeze({...this.state,outcome:Object.freeze({status:"stopped" as const,reason:this.lifecycle.snapshot().cancellationRequested?{code:"cancelled" as const,message:"Cancellation confirmed after quiescence and reconciliation."}:stop,partial:collectWorkflowPartial(this.snapshot()),pendingOperationRefs:Object.freeze([])})});}
    const record:WorkflowRecoveryRecord=Object.freeze({commandId,receiptRef:"workflow-recovery:"+commandId,proofRef:this.state.recoveryFence!.proofRef,action:resume?"resumed":"stopped",revision:this.state.revision+1});this.state=Object.freeze({...this.state,recoveryFence:null,recoveries:Object.freeze([...this.state.recoveries,record])});this.bump();return record;
  }
  private recoveryOwner(owner:string):void{if(this.state.engineOwner?.ownerToken!==owner||this.state.recoveryFence?.ownerToken!==owner||this.lifecycle.snapshot().status!=="recovering")throw new WorkflowRunError();}

  private owner(token:string):void{if(this.state.engineOwner?.ownerToken!==token||this.lifecycle.snapshot().status!=="active")throw new WorkflowRunError();}
  private expected(revision:number):void{if(this.state.revision!==revision)throw new WorkflowRunError();}
  private activeStep(stepId:string):StepRun|null{return [...this.steps.values()].find(step=>step.snapshot().stepId===stepId&&!step.snapshot().invalidated)??null;}
  private definitionStep(stepId:string):StepDefinition{const step=this.state.definition.steps.find(item=>item.id===stepId);if(step===undefined)throw new WorkflowRunError();return step;}
  private ownedAttempt(owner:string,attemptId:string,token:string,recording=false):WorkflowStepAttempt{if(recording){if(this.state.engineOwner?.ownerToken!==owner||!["active","stopping"].includes(this.lifecycle.snapshot().status))throw new WorkflowRunError();}else this.owner(owner);const attempt=this.state.attempts.find(item=>item.claim.attemptId===attemptId);if(attempt===undefined||
        attempt.claim.ownerToken!==token)throw new WorkflowRunError();return attempt;}
  private replace(attempt:WorkflowStepAttempt):void{this.state=Object.freeze({...this.state,attempts:Object.freeze(this.state.attempts.map(item=>item.claim.attemptId===attempt.claim.attemptId?Object.freeze(attempt):item))});this.bump();}
  private affected(stepId:string):readonly string[]{const selected=new Set([stepId]);let changed=true;while(changed){changed=false;for(const step of this.state.definition.steps)if(!selected.has(step.id)&&step.dependencies.some(id=>selected.has(id))){selected.add(step.id);changed=true;}}return [...selected];}
  private commandKey(claim:StepAttemptClaim):string{return same({runId:claim.runId,scope:claim.scope,workflow:claim.workflow,step:claim.step,view:claim.view,stepRunId:claim.stepRunId,maxRunAttempts:claim.maxRunAttempts});}
  private id(value:unknown):boolean{return typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(value);}
  private bump():void{if(!Number.isSafeInteger(this.state.revision+1)||
        !Number.isSafeInteger(this.state.dependencyRevision))throw new WorkflowRunError();this.state=Object.freeze({...this.state,revision:this.state.revision+1});}
  private audit():void{
    if(this.state.lifecycle.executionId!==this.state.runId||
        new Set(this.state.steps.map(step=>step.stepRunId)).size!==this.state.steps.length||
        new Set(this.state.attempts.map(item=>item.claim.attemptId)).size!==this.state.attempts.length||
        new Set(this.state.accepted.map(item=>item.stepId)).size!==this.state.accepted.length)throw new WorkflowRunError();
    for(const step of this.state.definition.steps){if(this.state.steps.filter(item=>item.stepId===step.id&&!item.invalidated).length>1||
        this.state.attempts.filter(item=>item.claim.step.id===step.id).length>step.maxAttempts)throw new WorkflowRunError();}
    for(const attempt of this.state.attempts){const step=this.steps.get(attempt.claim.stepRunId)?.snapshot();if(step===undefined||
        step.stepId!==attempt.claim.step.id||
        step.attemptId!==attempt.claim.attemptId)throw new WorkflowRunError();if(attempt.receipt!==null&&(attempt.receipt.attemptId!==attempt.claim.attemptId||
        same(attempt.receipt.outcome)!==same(attempt.outcome)))throw new WorkflowRunError();}
    for(const accepted of this.state.accepted){const attempt=this.state.attempts.find(item=>item.claim.attemptId===accepted.attemptId);if(attempt?.receipt?.acceptance.status!=="accepted"||
        attempt.outcome?.status!=="completed"||
        accepted.stepId!==attempt.claim.step.id||
        accepted.receiptRef!==attempt.receipt.receiptRef||
        same(accepted.result)!==same(attempt.outcome.result)||
        this.steps.get(attempt.claim.stepRunId)!.snapshot().invalidated)throw new WorkflowRunError();}

    const identityIds:string[]=[];const expectedPending=new Set<string>();
    for(let index=0;index<this.state.attempts.length;index++){
      const attempt=this.state.attempts[index],claim=attempt.claim,execution=this.steps.get(claim.stepRunId)!.snapshot();
      const count=this.state.attempts.slice(0,index+1).filter(item=>item.claim.step.id===claim.step.id).length;if(attempt.attemptNumber!==count)throw new WorkflowRunError();
      for(const id of [claim.commandId,claim.ownerToken,claim.attemptId,claim.operationId]){if(identityIds.includes(id))throw new WorkflowRunError();identityIds.push(id);}
      if(claim.view.dependencies.length!==claim.step.dependencies.length||
        claim.view.dependencies.some(dependency=>!claim.step.dependencies.includes(dependency.stepId)))throw new WorkflowRunError();
      for(const dependency of claim.view.dependencies){const prior=this.state.attempts.slice(0,index).find(item=>item.claim.attemptId===dependency.attemptId);if(prior?.receipt?.acceptance.status!=="accepted"||
        prior.outcome?.status!=="completed"||
        prior.claim.step.id!==dependency.stepId||
        prior.receipt.receiptRef!==dependency.receiptRef||
        same(prior.outcome.result)!==same(dependency.result))throw new WorkflowRunError();}
      const pending=(attempt.stage==="dispatching"?[claim.operationId]:attempt.outcome!==null&&attempt.outcome.status!=="completed"?attempt.outcome.pendingOperationRefs:[]).filter(ref=>!this.state.reconciliations.some(record=>record.operationRef===ref));
      for(const ref of pending)expectedPending.add(ref);if(same([...pending].sort())!==same([...execution.lifecycle.pendingOperationRefs].sort()))throw new WorkflowRunError();
      if(attempt.receipt!==null&&(attempt.receipt.runId!==this.state.runId||
        attempt.receipt.stepRunId!==claim.stepRunId||
        attempt.receipt.stepId!==claim.step.id||
        attempt.receipt.attemptNumber!==attempt.attemptNumber||
        same(attempt.receipt.workflow)!==same(claim.workflow)||
        same(attempt.receipt.executor)!==same(claim.step.executor)||
        attempt.receipt.viewRef!==claim.view.viewRef))throw new WorkflowRunError();
      if(attempt.receipt?.acceptance.status==="accepted"&&!execution.invalidated&&!this.state.accepted.some(result=>result.attemptId===claim.attemptId))throw new WorkflowRunError();
      if(attempt.receipt?.acceptance.status==="accepted"&&(execution.lifecycle.status!=="completed"||
        execution.lifecycle.evidence.acceptedResultRef!==attempt.receipt.receiptRef))throw new WorkflowRunError();
    }
    for(const execution of this.state.steps)if(execution.attemptId===null&&!["created","stopped","cancelled"].includes(execution.lifecycle.status)||
        execution.attemptId!==null&&!this.state.attempts.some(attempt=>attempt.claim.attemptId===execution.attemptId&&attempt.claim.stepRunId===execution.stepRunId))throw new WorkflowRunError();
    for(const record of this.state.transitions){const trigger=this.state.attempts.find(attempt=>attempt.claim.attemptId===record.triggerAttemptId)?.receipt;if(trigger===undefined||
        trigger===null)throw new WorkflowRunError();if(record.transitionId!==null){const transition=this.state.definition.transitions.find(item=>item.id===record.transitionId);if(transition===undefined||
        transition.fromStepId!==trigger.stepId||
        !this.affected(transition.toStepId).includes(trigger.stepId))throw new WorkflowRunError();}}
    if(this.state.transitionPlan!==null){expectedPending.add(this.state.transitionPlan.operationId);if(this.unprocessed()?.attemptId!==this.state.transitionPlan.triggerAttemptId)throw new WorkflowRunError();}
    if(same([...expectedPending].sort())!==same([...this.lifecycle.snapshot().pendingOperationRefs].sort()))throw new WorkflowRunError();
    if(new Set(this.state.reconciliations.map(record=>record.operationRef)).size!==this.state.reconciliations.length||new Set(this.state.recoveries.map(record=>record.commandId)).size!==this.state.recoveries.length)throw new WorkflowRunError();
    if(this.state.recoveryFence!==null&&(this.state.recoveryFence.ownerToken!==this.state.engineOwner?.ownerToken||!["recovering","stopping"].includes(this.lifecycle.snapshot().status)))throw new WorkflowRunError();
    const status=this.lifecycle.snapshot().status;
    if(this.state.engineOwner===null&&!(status==="active"&&this.state.recoveries.some(record=>record.action==="resumed"))&&(!(status==="created"||(status==="stopping"&&this.lifecycle.snapshot().cancellationRequested))||
        this.state.attempts.length!==0||
        this.state.steps.length!==0||
        this.state.accepted.length!==0||
        this.state.transitions.length!==0||
        this.state.transitionPlan!==null))throw new WorkflowRunError();
    if(this.state.outcome===null&&["completed","failed","stopped","cancelled"].includes(status)||
        this.state.outcome?.status==="completed"&&(status!=="completed"||
        this.state.completionDecision?.accepted!==true||
        this.unprocessed()!==null)||
        this.state.outcome?.status==="failed"&&status!=="failed"||
        this.state.outcome?.status==="stopped"&&!["stopped","cancelled"].includes(status))throw new WorkflowRunError();
    if(this.state.outcome?.status==="stopped"&&((status==="cancelled")!==(this.state.outcome.reason.code==="cancelled")))throw new WorkflowRunError();
    if(this.state.outcome?.status==="completed"&&(this.state.accepted.length!==this.state.definition.steps.length||
        same(this.state.outcome.result)!==same({runId:this.state.runId,results:this.state.accepted})))throw new WorkflowRunError();
  }
}
```

### `workflows/WorkflowRunSnapshotContract.ts`

Replace the earlier contract with schema-v2 validation. Existing schema-v1 payloads must be barrier-migrated; this reader fails closed on them rather than treating absent recovery history as permission to resume.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { WorkflowDefinitionContract } from "./WorkflowDefinitionContract";
import { StepInputPolicyInputContract } from "./StepInputPolicyInputContract";
import { StepAttemptReceiptContract } from "./StepAttemptReceiptContract";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract";
import { WorkflowRun } from "./WorkflowRun";
import { WorkflowRunError } from "../errors/WorkflowRunError";
import { canonicalWorkflowValue as same } from "./canonicalWorkflowValue";
export class WorkflowRunSnapshotContract implements IResultContract<WorkflowRunSnapshot>{
  readonly id="workflow-run-aggregate";readonly version="2";
  constructor(private readonly json:JsonValueContract,
    private readonly definitions:WorkflowDefinitionContract,
    private readonly views:StepInputPolicyInputContract,
    private readonly receipts:StepAttemptReceiptContract,
    private readonly outcomes:ExecutionOutcomeContract<import("../contracts/persistence/JsonValue").JsonValue>){}
  async validate(raw:unknown):Promise<ValidationResult<WorkflowRunSnapshot>>{
    const checked=await this.json.validate(raw);if(!checked.valid)return checked;if(new TextEncoder().encode(JSON.stringify(checked.value)).byteLength>2097152)return this.invalid();const row=checked.value as unknown as Record<string,unknown>;
    if(!this.object(row)||
        !this.keys(row,["schemaVersion","revision","dependencyRevision","runId","scope","definition","request","completionPolicy","budgetScopeId","deadlineEpochMs","lifecycle","engineOwner","steps","attempts","accepted","transitions","transitionPlan","completionDecision","outcome","reconciliations","recoveries","recoveryFence"])||
        row.schemaVersion!==2||
        !this.integer(row.revision)||
        !this.integer(row.dependencyRevision)||
        !this.validId(row.runId)||
        !this.validId(row.budgetScopeId)||
        !this.scope(row.scope)||
        !this.reference(row.completionPolicy)||
        !(row.deadlineEpochMs===null||
        this.integer(row.deadlineEpochMs))||
        !Array.isArray(row.steps)||
        row.steps.length>128||
        !Array.isArray(row.attempts)||
        row.attempts.length>128||
        !Array.isArray(row.accepted)||
        row.accepted.length>64||
        !Array.isArray(row.transitions)||
        row.transitions.length>128)return this.invalid();
    if(new TextEncoder().encode(JSON.stringify(row.request)).byteLength>65536)return this.invalid();
    if(!Array.isArray(row.reconciliations)||row.reconciliations.length>4096||!Array.isArray(row.recoveries)||row.recoveries.length>128)return this.invalid();
    for(const record of row.reconciliations)if(!this.object(record)||!this.keys(record,["operationRef","receiptRef"])||!this.ref(record.operationRef)||!this.ref(record.receiptRef))return this.invalid();
    for(const record of row.recoveries)if(!this.object(record)||!this.keys(record,["commandId","receiptRef","proofRef","action","revision"])||!this.validId(record.commandId)||!this.ref(record.receiptRef)||!this.ref(record.proofRef)||!["resumed","stopped"].includes(record.action as string)||!this.integer(record.revision)||record.revision>(row.revision as number))return this.invalid();
    if(row.recoveryFence!==null&&(!this.object(row.recoveryFence)||!this.keys(row.recoveryFence,["ownerToken","proofRef"])||!this.validId(row.recoveryFence.ownerToken)||!this.ref(row.recoveryFence.proofRef)))return this.invalid();
    const definition=await this.definitions.validate(row.definition);if(!definition.valid||
        row.attempts.length>definition.value.maxTotalAttempts||
        !(row.engineOwner===null||
        (this.object(row.engineOwner)&&this.keys(row.engineOwner,["commandId","ownerToken"])&&this.validId(row.engineOwner.commandId)&&this.validId(row.engineOwner.ownerToken))))return this.invalid();
    for(const step of row.steps)if(!this.object(step)||
        !this.keys(step,["stepId","stepRunId","invalidated","attemptId","lifecycle"])||
        !definition.value.steps.some(item=>item.id===step.stepId)||
        !this.validId(step.stepRunId)||
        typeof step.invalidated!=="boolean"||
        !(step.attemptId===null||
        this.validId(step.attemptId)))return this.invalid();
    for(const attempt of row.attempts){
      if(!this.object(attempt)||
        !this.keys(attempt,["claim","attemptNumber","stage","input","outcome","receipt"])||
        !this.integer(attempt.attemptNumber)||
        attempt.attemptNumber<1||
        attempt.attemptNumber>8||
        !["claimed","prepared","dispatching","outcome","committed"].includes(attempt.stage as string)||
        !this.object(attempt.claim))return this.invalid();
      if(new TextEncoder().encode(JSON.stringify(attempt.input)).byteLength>65536)return this.invalid();
      const claim=attempt.claim;
      if(!this.keys(claim,["commandId","ownerToken","attemptId","operationId","stepRunId","runId","scope","workflow","step","view","maxRunAttempts"])||
        ![claim.commandId,claim.ownerToken,claim.attemptId,claim.operationId,claim.stepRunId].every(value=>this.validId(value))||
        claim.runId!==row.runId||
        same(claim.scope)!==same(row.scope)||
        same(claim.workflow)!==same({id:definition.value.id,version:definition.value.version})||
        claim.maxRunAttempts!==definition.value.maxTotalAttempts||
        !this.object(claim.step)||
        same(claim.step)!==same(definition.value.steps.find(item=>item.id===(claim.step as Record<string,unknown>).id)))return this.invalid();
      const view=await this.views.validate(claim.view);if(!view.valid||
        view.value.stepId!==claim.step.id||
        same(view.value.workflow)!==same(claim.workflow)||
        same(view.value.request)!==same(row.request))return this.invalid();
      if((attempt.outcome===null)!==!["outcome","committed"].includes(attempt.stage as string)||
        (attempt.receipt!==null)!==(attempt.stage==="committed")||
        (attempt.outcome!==null&&!(await this.outcomes.validate(attempt.outcome)).valid)||
        (attempt.receipt!==null&&!(await this.receipts.validate(attempt.receipt)).valid))return this.invalid();
    }
    for(const result of row.accepted)if(!this.object(result)||
        !this.keys(result,["stepId","attemptId","receiptRef","result"])||
        !this.validId(result.stepId)||
        !this.validId(result.attemptId)||
        !this.ref(result.receiptRef))return this.invalid();
    const triggers=new Set<string>();
    for(const transition of row.transitions){if(!this.object(transition)||
        !this.keys(transition,["triggerAttemptId","transitionId","fixOperationId"])||
        !this.validId(transition.triggerAttemptId)||
        triggers.has(transition.triggerAttemptId as string)||
        !(transition.transitionId===null||
        definition.value.transitions.some(item=>item.id===transition.transitionId))||
        !(transition.fixOperationId===null||
        this.validId(transition.fixOperationId))||
        (transition.transitionId===null)!==(transition.fixOperationId===null))return this.invalid();triggers.add(transition.triggerAttemptId as string);}
    for(const transition of definition.value.transitions)if(row.transitions.filter(item=>(item as Record<string,unknown>).transitionId===transition.id).length>transition.maxTraversals)return this.invalid();
    if(row.transitionPlan!==null&&(!this.object(row.transitionPlan)||
        !this.keys(row.transitionPlan,["triggerAttemptId","transitionId","operationId"])||
        !this.validId(row.transitionPlan.triggerAttemptId)||
        !this.validId(row.transitionPlan.operationId)||
        !definition.value.transitions.some(item=>item.id===(row.transitionPlan as Record<string,unknown>).transitionId)))return this.invalid();
    const completion=row.completionDecision;if(completion!==null&&(!this.object(completion)||
        !((completion.accepted===true&&this.keys(completion,["accepted"]))||
        (completion.accepted===false&&this.keys(completion,["accepted","code","message"])&&typeof completion.code==="string"&&/^[A-Z0-9_:-]{1,128}$/.test(completion.code)&&typeof completion.message==="string"&&completion.message.length>0&&completion.message.length<=1024))))return this.invalid();
    if(row.outcome!==null&&!(await this.outcomes.validate(row.outcome)).valid)return this.invalid();
    try{const run=await WorkflowRun.restore(checked.value as unknown as WorkflowRunSnapshot);return {valid:true,value:run.snapshot()};}catch(error){if(!(error instanceof WorkflowRunError)&&!(error instanceof Error&&["InvalidLifecycleSnapshotError","InvalidLifecycleTransitionError"].includes(error.name)))throw error;return this.invalid();}
  }
  private object(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  private keys(row:Record<string,unknown>,keys:readonly string[]):boolean{return Object.keys(row).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(row,key));}
  private validId(value:unknown):boolean{return typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(value);}
  private ref(value:unknown):boolean{return typeof value==="string"&&value.length>0&&value.length<=256;}
  private integer(value:unknown):value is number{return typeof value==="number"&&Number.isSafeInteger(value)&&value>=0;}
  private reference(value:unknown):boolean{return this.object(value)&&this.keys(value,["id","version"])&&this.validId(value.id)&&this.validId(value.version);}
  private scope(value:unknown):boolean{return this.object(value)&&(this.keys(value,["scopeId","projectId"])||this.keys(value,["scopeId","projectId","workspaceId"]))&&this.validId(value.scopeId)&&this.validId(value.projectId)&&(value.workspaceId===undefined||this.validId(value.workspaceId));}
  private invalid():ValidationResult<never>{return {valid:false,issues:[{path:[],code:"INVALID_WORKFLOW_RUN",message:"Workflow run aggregate is malformed or inconsistent."}]};}
}
```

### `workflows/StepRunner.ts`

Replace the earlier runner with a shared normal/resume path. Prepared input is reused, and a saved outcome resumes only semantic acceptance; dispatching without authoritative recovery remains pending.

```typescript
import type { WorkflowStepAttempt } from "./WorkflowStepAttempt";
import type { StepRunRequest } from "./StepRunRequest";
import type { StepRunOutcome } from "./StepRunOutcome";
import type { StepAttemptClaim } from "./StepAttemptClaim";
import type { StepResultAcceptance } from "./StepResultAcceptance";
import type { IStepContextVerifier } from "./IStepContextVerifier";
import type { IStepAttemptJournal } from "./IStepAttemptJournal";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import type { IClock } from "../contracts/runtime/IClock";
import { WorkflowDefinitionRegistry } from "./WorkflowDefinitionRegistry";
import { StepPolicyRegistry } from "./StepPolicyRegistry";
import { StepInputPolicyInputContract } from "./StepInputPolicyInputContract";
import { StepResultAcceptanceContract } from "./StepResultAcceptanceContract";
import { StepAttemptReceiptContract } from "./StepAttemptReceiptContract";
import { ExecutorRegistry } from "../executors/ExecutorRegistry";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { StepExecutionError } from "../errors/StepExecutionError";
export class StepRunner{
  constructor(private readonly definitions:WorkflowDefinitionRegistry,
    private readonly executors:ExecutorRegistry,
    private readonly policies:StepPolicyRegistry,
    private readonly views:StepInputPolicyInputContract,
    private readonly outcomes:ExecutionOutcomeContract<JsonValue>,
    private readonly decisions:StepResultAcceptanceContract,
    private readonly receipts:StepAttemptReceiptContract,
    private readonly verifier:IStepContextVerifier,
    private readonly journal:IStepAttemptJournal,
    private readonly json:JsonValueContract,
    private readonly ids:IIdGenerator,
    private readonly clock:IClock){}
  async run(request:StepRunRequest,context:IExecutionContext):Promise<StepRunOutcome>{
    context=Object.freeze({...context,identity:Object.freeze({...context.identity}),scope:Object.freeze({...context.scope})});
    if(![context.identity.operationId,context.identity.runId,context.identity.stepRunId].every(value=>typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(value))||
        context.identity.sessionId!==undefined)throw new StepExecutionError();
    const definition=this.definitions.resolve(request.workflow),step=definition.steps.find(item=>item.id===request.stepId);
    const checked=await this.views.validate(request.view);if(step===undefined||!checked.valid)return {status:"blocked",code:"INVALID_STEP_VIEW"};const view=checked.value;
    if(view.workflow.id!==definition.id||
        view.workflow.version!==definition.version||
        view.stepId!==step.id||
        view.dependencies.length!==step.dependencies.length||
        view.dependencies.some(dependency=>!step.dependencies.includes(dependency.stepId)))return {status:"blocked",code:"STEP_DEPENDENCIES_MISMATCH"};
    const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);
    if(guard.check()!==null)return {status:"blocked",code:"STEP_CONTROL_STOP"};
    if(!await this.verifier.verify(view,definition,context))return {status:"blocked",code:"STEP_VIEW_UNVERIFIED"};
    if(guard.check()!==null)return {status:"blocked",code:"STEP_CONTROL_STOP"};
    const fresh=[this.ids.nextId(),this.ids.nextId(),this.ids.nextId()];if(new Set(fresh).size!==3||
        fresh.some(id=>!/^[A-Za-z0-9_.:-]{1,128}$/.test(id)||
        [context.identity.operationId,context.identity.runId,context.identity.stepRunId].includes(id)))throw new StepExecutionError();
    const claim:StepAttemptClaim=Object.freeze({commandId:context.identity.operationId,ownerToken:fresh[0],attemptId:fresh[1],operationId:fresh[2],stepRunId:context.identity.stepRunId!,runId:context.identity.runId!,scope:Object.freeze({...context.scope}),workflow:Object.freeze({id:definition.id,version:definition.version}),step,view,maxRunAttempts:definition.maxTotalAttempts});
    const admission=await this.journal.claim(claim);
    if(admission.status==="blocked")return this.safeBlocked(admission.code);
    if(admission.status==="existing")return this.existing(admission.outcome,claim);
    const attemptNumber=admission.attemptNumber;if(!Number.isSafeInteger(attemptNumber)||attemptNumber<1||attemptNumber>step.maxAttempts)throw new StepExecutionError();
    const execution:IExecutionContext=Object.freeze({...context,scope:claim.scope,identity:Object.freeze({...context.identity,operationId:claim.operationId,parentOperationId:claim.commandId})});
    return this.advance(claim,attemptNumber,execution,null,null);
  }
  async resume(attempt:WorkflowStepAttempt,context:IExecutionContext):Promise<StepRunOutcome>{
    if(attempt.receipt!==null)return this.existing({status:"recorded",receipt:attempt.receipt},attempt.claim);
    if(attempt.stage==="dispatching")return {status:"pending",attemptId:attempt.claim.attemptId,pendingOperationRefs:[attempt.claim.operationId]};
    if(context.identity.runId!==attempt.claim.runId||context.identity.stepRunId!==attempt.claim.stepRunId||context.identity.operationId!==attempt.claim.operationId)throw new StepExecutionError();
    return this.advance(attempt.claim,attempt.attemptNumber,context,attempt.stage==="claimed"?null:{value:attempt.input},attempt.outcome);
  }
  private async advance(claim:StepAttemptClaim,attemptNumber:number,execution:IExecutionContext,prepared:Readonly<{value:JsonValue}>|null,saved:ExecutionOutcome<JsonValue>|null):Promise<StepRunOutcome>{
    const view=claim.view,step=claim.step,definition=this.definitions.resolve(claim.workflow),guard=new ExecutionBoundaryGuard(this.clock,execution.signal,execution.deadlineEpochMs);
    const projected=prepared!==null?prepared.value:await this.policies.input(step.inputPolicy).apply(view),input=await this.json.validate(projected);
    if(!input.valid||
        new TextEncoder().encode(JSON.stringify(input.value)).byteLength>65536){const failed:ExecutionOutcome<JsonValue>={status:"failed",error:{code:"STEP_INPUT_POLICY_INVALID",message:"Input policy did not produce bounded JSON."},partial:{summary:"",evidenceRefs:[],artifactRefs:[],unresolved:["Prepare valid executor input."]},pendingOperationRefs:[]};await this.journal.recordOutcome(claim.attemptId,claim.ownerToken,failed);return this.finish(claim,attemptNumber,failed,{status:"not-evaluated",code:"INPUT_REJECTED",message:"Executor did not start."},execution);}
    if(prepared===null)await this.journal.prepare(claim.attemptId,claim.ownerToken,input.value);
    let outcome:import("../contracts/validation/ValidationResult").ValidationResult<ExecutionOutcome<JsonValue>>;
    if(saved!==null){outcome=await this.outcomes.validate(saved);if(!outcome.valid)throw new StepExecutionError();}
    else{
    const stop=guard.check();const verified=stop===null&&await this.verifier.verify(view,definition,execution);const afterVerify=guard.check();
    if(stop!==null||
        afterVerify!==null||
        !verified){const reason=stop??afterVerify??{code:"no-progress" as const,message:"Prepared step context is no longer current."};const stopped:ExecutionOutcome<JsonValue>={status:"stopped",reason,partial:{summary:"Prepared executor input is retained in the attempt journal.",evidenceRefs:[],artifactRefs:[],unresolved:["Executor did not start."]},pendingOperationRefs:[]};await this.journal.recordOutcome(claim.attemptId,claim.ownerToken,stopped);return this.finish(claim,attemptNumber,stopped,{status:"not-evaluated",code:"DISPATCH_BLOCKED",message:"Controls or source view prevented dispatch."},execution);}
    if(!await this.journal.beginDispatch(claim.attemptId,claim.ownerToken))return {status:"pending",attemptId:claim.attemptId,pendingOperationRefs:[claim.operationId]};
    const dispatchStop=guard.check();
    if(dispatchStop!==null){const stopped:ExecutionOutcome<JsonValue>={status:"stopped",reason:dispatchStop,partial:{summary:"Prepared input retained; executor did not start.",evidenceRefs:[],artifactRefs:[],unresolved:["Executor did not start."]},pendingOperationRefs:[]};await this.journal.recordOutcome(claim.attemptId,claim.ownerToken,stopped);return this.finish(claim,attemptNumber,stopped,{status:"not-evaluated",code:"DISPATCH_BLOCKED",message:"Controls prevented executor invocation."},execution);}
    const registered=this.executors.resolve(step.executor.id,step.executor.version);
    outcome=await this.outcomes.validate(await registered.execute(input.value,execution));if(!outcome.valid)throw new StepExecutionError();
    await this.journal.recordOutcome(claim.attemptId,claim.ownerToken,outcome.value);
    }
    if(outcome.value.status!=="completed")return this.finish(claim,attemptNumber,outcome.value,{status:"not-evaluated",code:"EXECUTOR_INCOMPLETE",message:"Executor returned stopped or failed work."},execution);
    if(guard.check()!==null)return this.finish(claim,attemptNumber,outcome.value,{status:"not-evaluated",code:"STEP_CONTROL_STOP",message:"Candidate retained; controls prevent acceptance."},execution);
    if(!await this.verifier.verify(view,definition,execution))return this.finish(claim,attemptNumber,outcome.value,{status:"not-evaluated",code:"STALE_STEP_VIEW",message:"Candidate retained; dependency/source view changed."},execution);
    if(guard.check()!==null)return this.finish(claim,attemptNumber,outcome.value,{status:"not-evaluated",code:"STEP_CONTROL_STOP",message:"Candidate retained; controls prevent acceptance."},execution);
    const rawDecision=await this.policies.accept(step.acceptancePolicy).apply(Object.freeze({view,input:input.value,candidate:outcome.value.result,execution}));
    const decision=await this.decisions.validate(rawDecision);if(!decision.valid||decision.value.status==="not-evaluated")throw new StepExecutionError();
    let acceptance:StepResultAcceptance=decision.value;
    if(guard.check()!==null)acceptance={status:"not-evaluated",code:"STEP_CONTROL_STOP",message:"Candidate retained; controls prevent acceptance."};
    else if(!await this.verifier.verify(view,definition,execution))acceptance={status:"not-evaluated",code:"STALE_STEP_VIEW",message:"Candidate retained; dependency/source view changed."};
    if(guard.check()!==null)acceptance={status:"not-evaluated",code:"STEP_CONTROL_STOP",message:"Candidate retained; controls prevent acceptance."};
    return this.finish(claim,attemptNumber,outcome.value,acceptance,execution);
  }
  private async finish(claim:StepAttemptClaim,attemptNumber:number,outcome:ExecutionOutcome<JsonValue>,acceptance:StepResultAcceptance,context:IExecutionContext):Promise<StepRunOutcome>{
    const expected=await this.outcomes.validate(outcome);if(!expected.valid)throw new StepExecutionError();
    const receipt=await this.receipts.validate(await this.journal.commit(claim.attemptId,claim.ownerToken,acceptance,context));if(!receipt.valid)throw new StepExecutionError();
    this.match(receipt.value,claim);if(receipt.value.attemptId!==claim.attemptId||
        receipt.value.attemptNumber!==attemptNumber||
        JSON.stringify(receipt.value.outcome)!==JSON.stringify(expected.value)||
        (receipt.value.acceptance.status==="accepted"&&acceptance.status!=="accepted"))throw new StepExecutionError();
    return {status:"recorded",receipt:receipt.value};
  }
  private async existing(outcome:StepRunOutcome,claim:StepAttemptClaim):Promise<StepRunOutcome>{
    if(outcome.status==="recorded"){const receipt=await this.receipts.validate(outcome.receipt);if(!receipt.valid)throw new StepExecutionError();this.match(receipt.value,claim);return {status:"recorded",receipt:receipt.value};}
    if(outcome.status==="blocked")return this.safeBlocked(outcome.code);
    if(outcome.status!=="pending"||
        !/^[A-Za-z0-9_.:-]{1,128}$/.test(outcome.attemptId)||
        !Array.isArray(outcome.pendingOperationRefs)||
        outcome.pendingOperationRefs.length<1||
        outcome.pendingOperationRefs.length>64||
        outcome.pendingOperationRefs.some(ref=>typeof ref!=="string"||
        ref.length<1||
        ref.length>256))throw new StepExecutionError();
    return Object.freeze({status:"pending",attemptId:outcome.attemptId,pendingOperationRefs:Object.freeze([...outcome.pendingOperationRefs])});
  }
  private match(receipt:import("./StepAttemptReceipt").StepAttemptReceipt,claim:StepAttemptClaim):void{if(receipt.attemptNumber>claim.step.maxAttempts||
        receipt.runId!==claim.runId||
        receipt.stepRunId!==claim.stepRunId||
        receipt.stepId!==claim.step.id||
        receipt.workflow.id!==claim.workflow.id||
        receipt.workflow.version!==claim.workflow.version||
        receipt.viewRef!==claim.view.viewRef||
        Object.keys(receipt.executor).some(key=>receipt.executor[key as keyof typeof receipt.executor]!==claim.step.executor[key as keyof typeof receipt.executor]))throw new StepExecutionError();}
  private safeBlocked(code:string):StepRunOutcome{if(!/^[A-Z0-9_:-]{1,128}$/.test(code))throw new StepExecutionError();return {status:"blocked",code};}
}
```

### `workflows/WorkflowEngine.ts`

Replace the earlier engine with durable cancellation observation and explicit recovery-ready attempt continuation. Normal acquire still cannot steal a fenced owner, and dispatching operations are never automatically replayed.

```typescript
import type { IWorkflowRunStore } from "./IWorkflowRunStore";
import type { IWorkflowStepRunnerFactory } from "./IWorkflowStepRunnerFactory";
import type { WorkflowEngineOutcome } from "./WorkflowEngineOutcome";
import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot";
import type { StepContextEvidenceInput } from "./StepContextEvidenceInput";
import type { IPolicy } from "../contracts/IPolicy";
import type { IUsageLedgerStore } from "../usage/IUsageLedgerStore";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import type { IClock } from "../contracts/runtime/IClock";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason";
import { WorkflowRun } from "./WorkflowRun";
import { WorkflowPolicyRegistry } from "./WorkflowPolicyRegistry";
import { WorkflowStepAttemptJournal } from "./WorkflowStepAttemptJournal";
import { WorkflowStepContextVerifier } from "./WorkflowStepContextVerifier";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { zeroUsage } from "../usage/zeroUsage";
import { collectWorkflowPartial } from "./collectWorkflowPartial";
import { canonicalWorkflowValue as same } from "./canonicalWorkflowValue";
import { WorkflowRunError } from "../errors/WorkflowRunError";
export class WorkflowEngine{
 constructor(private readonly store:IWorkflowRunStore,
    private readonly runners:IWorkflowStepRunnerFactory,
    private readonly policies:WorkflowPolicyRegistry,
    private readonly evidence:IPolicy<StepContextEvidenceInput,boolean>,
    private readonly ledger:IUsageLedgerStore,
    private readonly ids:IIdGenerator,
    private readonly clock:IClock,
    private readonly json:JsonValueContract){}
 async run(rawContext:IExecutionContext):Promise<WorkflowEngineOutcome>{
  let snapshot=await this.store.read();
  if(rawContext.identity.runId!==snapshot.runId||
        rawContext.identity.stepRunId!==undefined||
        rawContext.identity.sessionId!==undefined||
        same(rawContext.scope)!==same(snapshot.scope)||
        !/^[A-Za-z0-9_.:-]{1,128}$/.test(rawContext.identity.operationId))throw new WorkflowRunError();
  this.policies.completion(snapshot.completionPolicy);for(const transition of snapshot.definition.transitions){this.policies.transition(transition.policy);const ancestors=new Set([transition.fromStepId]);let changed=true;while(changed){changed=false;for(const step of snapshot.definition.steps)if(ancestors.has(step.id))for(const dependency of step.dependencies)if(!ancestors.has(dependency)){ancestors.add(dependency);changed=true;}}if(!ancestors.has(transition.toStepId))throw new WorkflowRunError();}
  const deadlines=[snapshot.deadlineEpochMs,rawContext.deadlineEpochMs].filter((value):value is number=>value!==null);
  const context:IExecutionContext=Object.freeze({...rawContext,identity:Object.freeze({...rawContext.identity}),scope:snapshot.scope,deadlineEpochMs:deadlines.length===0?null:Math.min(...deadlines)});
  if(snapshot.outcome!==null||snapshot.lifecycle.cancellationRequested)return this.present(snapshot);
  const owner=this.ids.nextId();if(!/^[A-Za-z0-9_.:-]{1,128}$/.test(owner)||owner===context.identity.operationId)throw new WorkflowRunError();
  if(!await this.store.mutate(run=>run.acquire(context.identity.operationId,owner)))return this.present(await this.store.read());
  const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);
  const runner=this.runners.create(new WorkflowStepAttemptJournal(this.store,owner,this.clock),new WorkflowStepContextVerifier(this.store,this.evidence));
  for(let boundary=0;boundary<snapshot.definition.maxTotalAttempts*3+8;boundary++){
   snapshot=await this.store.read();if(snapshot.lifecycle.cancellationRequested)return this.present(snapshot);const stop=guard.check();if(stop!==null)return this.stop(owner,stop);
   if(snapshot.lifecycle.pendingOperationRefs.length>0){await this.store.mutate(run=>run.interrupt(owner));return this.present(await this.store.read());}
   const aggregate=await WorkflowRun.restore(snapshot);
   const unfinished=snapshot.attempts.find(attempt=>attempt.receipt===null);
   if(unfinished!==undefined){const execution:IExecutionContext=Object.freeze({...context,identity:Object.freeze({...context.identity,operationId:unfinished.claim.operationId,stepRunId:unfinished.claim.stepRunId,parentOperationId:unfinished.claim.commandId})});const result=await runner.resume(unfinished,execution);if(result.status==="pending"){await this.store.mutate(run=>run.interrupt(owner));return this.present(await this.store.read());}if(result.status==="blocked")return this.stop(owner,{code:"no-progress",message:"Recovered attempt could not advance."});continue;}
   const trigger=aggregate.unprocessed();
   if(trigger!==null){
    let chosen:string|null=null;
    for(const transition of snapshot.definition.transitions.filter(item=>item.fromStepId===trigger.stepId)){
     const decision=await this.json.validate(await this.policies.transition(transition.policy).apply(Object.freeze({run:snapshot,trigger,execution:context})));
     if(!decision.valid||
        decision.value===null||
        typeof decision.value!=="object"||
        Array.isArray(decision.value)||
        Object.keys(decision.value).length!==1||
        typeof (decision.value as Record<string,unknown>).take!=="boolean")throw new WorkflowRunError();
     if((decision.value as Record<string,unknown>).take===true){chosen=transition.id;break;}
    }
    const afterPolicy=guard.check();if(afterPolicy!==null)return this.stop(owner,afterPolicy);
    if(chosen===null){await this.store.mutate(run=>run.consume(owner,snapshot.revision,trigger.attemptId));continue;}
    const transitionId=chosen,fixId=this.ids.nextId();
    const plan=await this.store.mutate(run=>run.stageCorrection(owner,snapshot.revision,trigger.attemptId,transitionId,fixId));
    if(plan===null)return this.stop(owner,{code:"limit-reached",message:"Correction traversal or remaining attempt allowance is exhausted."});
    const admitted=await this.ledger.mutate(ledger=>{const reservation=ledger.reserve(plan.operationId,snapshot.budgetScopeId,{...zeroUsage,fixes:1});if(reservation.admitted&&!reservation.replayed)ledger.settle(plan.operationId,{...zeroUsage,fixes:1});return reservation;});
    if(!admitted.admitted){await this.store.mutate(run=>run.denyCorrection(owner,plan));return this.stop(owner,{code:"limit-reached",message:"Shared correction allowance is exhausted."});}
    if(admitted.replayed){await this.store.mutate(run=>run.interrupt(owner));return this.present(await this.store.read());}
    const afterBudget=guard.check();if(afterBudget!==null)return this.stop(owner,afterBudget);
    await this.store.mutate(run=>run.applyCorrection(owner,plan));continue;
   }
   if(snapshot.accepted.length===snapshot.definition.steps.length){
    const checked=await this.json.validate(await this.policies.completion(snapshot.completionPolicy).apply(Object.freeze({run:snapshot,execution:context})));
    if(!checked.valid||
        checked.value===null||
        typeof checked.value!=="object"||
        Array.isArray(checked.value))throw new WorkflowRunError();const decision=checked.value as Record<string,unknown>;
    if(decision.accepted===true&&Object.keys(decision).length===1){const after=guard.check();if(after!==null)return this.stop(owner,after);await this.store.mutate(run=>{const atCommit=guard.check();if(atCommit!==null)run.stop(owner,atCommit);else run.complete(owner,snapshot.revision);});return this.present(await this.store.read());}
    if(decision.accepted!==false||
        Object.keys(decision).length!==3||
        typeof decision.code!=="string"||
        !/^[A-Z0-9_:-]{1,128}$/.test(decision.code)||
        typeof decision.message!=="string"||
        decision.message.length<1||
        decision.message.length>1024)throw new WorkflowRunError();
    await this.store.mutate(run=>run.rejectCompletion(owner,snapshot.revision,{accepted:false,code:decision.code as string,message:decision.message as string},guard.check()));return this.present(await this.store.read());
   }
   const step=aggregate.ready();
   if(step===null){const last=snapshot.attempts[snapshot.attempts.length-1]?.outcome;if(last?.status==="failed"){await this.store.mutate(run=>run.fail(owner));return this.present(await this.store.read());}return this.stop(owner,last?.status==="stopped"?last.reason:{code:"no-progress",message:"No ready step or declared correction can advance the retained results."});}
   const proposedStepRunId=this.ids.nextId();
   const stepRunId=await this.store.mutate(run=>run.openStep(owner,step.id,proposedStepRunId));
   if(stepRunId===null)return this.stop(owner,{code:"limit-reached",message:"Workflow or step attempt allowance is exhausted."});
   const view=(await WorkflowRun.restore(await this.store.read())).view(step.id);
   const execution:IExecutionContext=Object.freeze({...context,identity:Object.freeze({...context.identity,stepRunId,operationId:this.ids.nextId(),parentOperationId:context.identity.operationId})});
   const result=await runner.run({workflow:{id:snapshot.definition.id,version:snapshot.definition.version},stepId:step.id,view},execution);
   if(result.status==="pending"){await this.store.mutate(run=>run.interrupt(owner));return this.present(await this.store.read());}
   if(result.status==="blocked")return this.stop(owner,{code:"no-progress",message:"StepRunner blocked the attempt: "+result.code});
  }
  return this.stop(owner,{code:"no-progress",message:"Workflow orchestration boundary limit reached."});
 }
 private async stop(owner:string,reason:ExecutionStopReason):Promise<WorkflowEngineOutcome>{await this.store.mutate(run=>run.stop(owner,reason));return this.present(await this.store.read());}
 private present(snapshot:WorkflowRunSnapshot):WorkflowEngineOutcome{
  if(snapshot.outcome!==null)return Object.freeze({status:"finished",outcome:snapshot.outcome});
  const pending=[...new Set([...snapshot.lifecycle.pendingOperationRefs,...snapshot.attempts.filter(attempt=>attempt.receipt===null).map(attempt=>attempt.claim.operationId)])];
  return pending.length===0?{status:"busy",runId:snapshot.runId}:{status:"pending",runId:snapshot.runId,partial:collectWorkflowPartial(snapshot),pendingOperationRefs:Object.freeze(pending)};
 }
}
```

### `workflows/recovery/WorkflowRecoverySchemaMigrator.ts`

Migrates only the observed, barrier-held schema-v1 row to schema v2, preserving every old field. Upgrade/fence all old workers first. Unknown versions and malformed records fail; neither initialize nor recovery recreates an existing run.

```typescript
import type { ISqlDatabase } from "../../persistence/sql/ISqlDatabase";
import type { WorkflowRunStatements } from "../WorkflowRunStatements";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec";
import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot";
import type { IRecoveryLease } from "./IRecoveryLease";
import { ExecutionRecoveryError } from "../../errors/ExecutionRecoveryError";
import { canonicalWorkflowValue as same } from "../canonicalWorkflowValue";
export class WorkflowRecoverySchemaMigrator{
 constructor(private readonly database:ISqlDatabase,private readonly sql:WorkflowRunStatements,private readonly codec:IRecordCodec<WorkflowRunSnapshot>){}
 async migrate(lease:IRecoveryLease):Promise<void>{if(!await lease.assertHeld())throw new ExecutionRecoveryError();const key=[lease.scope.scopeId,lease.scope.projectId,lease.runId];await this.database.migrationTransaction(async tx=>{if((await tx.query(this.sql.lock,key)).affectedRows!==1)throw new ExecutionRecoveryError();const rows=(await tx.query(this.sql.read,key)).rows;if(rows.length!==1||typeof rows[0].payload!=="string")throw new ExecutionRecoveryError();const old=JSON.parse(rows[0].payload);if(old===null||typeof old!=="object")throw new ExecutionRecoveryError();let payload=rows[0].payload;if(old.schemaVersion===1){if(["reconciliations","recoveries","recoveryFence"].some(key=>key in old))throw new ExecutionRecoveryError();payload=await this.codec.encode({...old,schemaVersion:2,reconciliations:[],recoveries:[],recoveryFence:null});}const run=await this.codec.decode(payload);if(run.runId!==lease.runId||same(run.scope)!==same(lease.scope)||(run.engineOwner?.ownerToken??null)!==lease.previousOwnerToken)throw new ExecutionRecoveryError();if((await tx.query(this.sql.update,[payload,...key])).affectedRows!==1)throw new ExecutionRecoveryError();});}
}
```

### `workflows/recovery/ExecutionCheckpointStore.ts`

Saves immutable, content-addressed checkpoint artifacts and reads them through the scoped integrity-checking artifact reader. A checkpoint is audit/reconstruction input: it never overwrites the current SQL run or usage ledger.

```typescript
import type { IArtifactWriter } from "../../artifacts/IArtifactWriter";
import type { IArtifactReader } from "../../artifacts/IArtifactReader";
import type { IArtifactDigest } from "../../artifacts/IArtifactDigest";
import type { ArtifactRef } from "../../artifacts/ArtifactRef";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec";
import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot";
import type { UsageLedgerSnapshot } from "../../usage/UsageLedgerSnapshot";
import type { ExecutionCheckpointManifest } from "./ExecutionCheckpointManifest";
import { JsonValueContract } from "../../persistence/JsonValueContract";
import { canonicalWorkflowValue as same } from "../canonicalWorkflowValue";
import { ExecutionRecoveryError } from "../../errors/ExecutionRecoveryError";
export class ExecutionCheckpointStore{
 constructor(private readonly writer:IArtifactWriter,private readonly reader:IArtifactReader,private readonly digest:IArtifactDigest,private readonly json:JsonValueContract,private readonly runs:IRecordCodec<WorkflowRunSnapshot>,private readonly usages:IRecordCodec<UsageLedgerSnapshot>){}
 async save(run:WorkflowRunSnapshot,usage:UsageLedgerSnapshot,checkpointId:string,proofRef:string,participants:ExecutionCheckpointManifest["participants"],signal:AbortSignal):Promise<ArtifactRef>{
  const runRef=await this.write(await this.runs.encode(run),"workflow-run",signal),usageRef=await this.write(await this.usages.encode(usage),"usage-ledger",signal);
  const manifest:ExecutionCheckpointManifest={schemaVersion:1,checkpointId,runId:run.runId,scope:run.scope,runRevision:run.revision,proofRef,run:runRef,usage:usageRef,participants};await this.manifest(manifest);return this.write(JSON.stringify(manifest),"execution-checkpoint",signal);
 }
 async read(reference:ArtifactRef,scope:ExecutionScopeRef,signal:AbortSignal):Promise<Readonly<{manifest:ExecutionCheckpointManifest;run:WorkflowRunSnapshot;usage:UsageLedgerSnapshot}>>{
  const manifest=await this.manifest(JSON.parse(await this.text(reference,scope,signal)));const run=await this.runs.decode(await this.text(manifest.run,scope,signal)),usage=await this.usages.decode(await this.text(manifest.usage,scope,signal));if(same(manifest.scope)!==same(scope)||same(run.scope)!==same(scope)||run.runId!==manifest.runId||run.revision!==manifest.runRevision)throw new ExecutionRecoveryError();return {manifest,run,usage};
 }
 private async write(payload:string,kind:string,signal:AbortSignal):Promise<ArtifactRef>{const bytes=new TextEncoder().encode(payload);if(bytes.byteLength>2097152)throw new ExecutionRecoveryError();const hash=await this.digest.hash(bytes);return this.writer.write({name:kind,kind,mediaType:"application/json",schemaId:kind,schemaVersion:kind==="workflow-run"?"2":"1",sourceRefs:[],idempotencyKey:"checkpoint:"+hash,expiresAtEpochMs:null,data:bytes},signal);}
 private async text(ref:ArtifactRef,scope:ExecutionScopeRef,signal:AbortSignal):Promise<string>{if(!this.artifact(ref))throw new ExecutionRecoveryError();const value=await this.reader.read(ref,2097152,signal);if(same(value.metadata.scope)!==same(scope))throw new ExecutionRecoveryError();return new TextDecoder("utf-8",{fatal:true}).decode(value.data);}
 private async manifest(value:unknown):Promise<ExecutionCheckpointManifest>{const checked=await this.json.validate(value);if(!checked.valid)throw new ExecutionRecoveryError();const v=checked.value as unknown as ExecutionCheckpointManifest;if(!this.keys(v,["schemaVersion","checkpointId","runId","scope","runRevision","proofRef","run","usage","participants"])||v.schemaVersion!==1||![v.checkpointId,v.runId].every(id=>typeof id==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(id))||!Number.isSafeInteger(v.runRevision)||v.runRevision<0||!this.ref(v.proofRef)||v.scope===null||typeof v.scope!=="object"||!this.artifact(v.run)||!this.artifact(v.usage)||!Array.isArray(v.participants)||v.participants.length>16)throw new ExecutionRecoveryError();const ids=new Set<string>();for(const item of v.participants){if(!this.keys(item,["registration","reference"])||!this.keys(item.registration,["id","version"])||!this.ref(item.registration.id)||!this.ref(item.registration.version)||!this.artifact(item.reference)||ids.has(item.registration.id))throw new ExecutionRecoveryError();ids.add(item.registration.id);}return v;}
 private keys(v:unknown,keys:readonly string[]):boolean{return v!==null&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(v,key));}
 private ref(v:unknown):v is string{return typeof v==="string"&&v.length>0&&v.length<=256;}
 private artifact(v:unknown):v is ArtifactRef{if(!this.keys(v,["artifactId","digest","byteLength","mediaType","schemaId","schemaVersion"]))return false;const r=v as ArtifactRef;return this.ref(r.artifactId)&&typeof r.digest==="string"&&/^[a-f0-9]{64}$/.test(r.digest)&&Number.isSafeInteger(r.byteLength)&&r.byteLength>=0&&this.ref(r.mediaType)&&(r.schemaId===null||this.ref(r.schemaId))&&(r.schemaVersion===null||this.ref(r.schemaVersion));}
}
```

### `workflows/recovery/WorkflowCheckpointCoordinator.ts`

Captures only behind the host barrier, fences dispatch first, and confirms run and usage did not change across capture. Attaching the checkpoint increments the run revision; the manifest records the preceding captured revision. Capture leaves a live run recovering, requiring explicit recovery before further work.

```typescript
import type { IWorkflowRunStore } from "../IWorkflowRunStore";
import type { IUsageLedgerStore } from "../../usage/IUsageLedgerStore";
import type { IRecoveryBarrier } from "./IRecoveryBarrier";
import type { ICheckpointParticipant } from "./ICheckpointParticipant";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator";
import type { ArtifactRef } from "../../artifacts/ArtifactRef";
import { ExecutionCheckpointStore } from "./ExecutionCheckpointStore";
import { canonicalWorkflowValue as same } from "../canonicalWorkflowValue";
import { ExecutionRecoveryError } from "../../errors/ExecutionRecoveryError";
export class WorkflowCheckpointCoordinator{
 constructor(private readonly runs:IWorkflowRunStore,private readonly usage:IUsageLedgerStore,private readonly barrier:IRecoveryBarrier,private readonly artifacts:ExecutionCheckpointStore,private readonly participants:readonly ICheckpointParticipant[],private readonly ids:IIdGenerator){}
 async capture(context:IExecutionContext):Promise<ArtifactRef>{const observed=await this.runs.read();if(context.identity.runId!==observed.runId||same(context.scope)!==same(observed.scope))throw new ExecutionRecoveryError();const lease=await this.barrier.acquire(observed,context);if(lease===null)throw new ExecutionRecoveryError();try{if(lease.runId!==observed.runId||same(lease.scope)!==same(observed.scope)||lease.previousOwnerToken!==(observed.engineOwner?.ownerToken??null)||!await lease.assertHeld())throw new ExecutionRecoveryError();const owner=this.ids.nextId();if(observed.outcome===null)await this.runs.mutate(run=>run.fenceRecovery(observed.revision,lease.previousOwnerToken,owner,lease.proofRef));const run=await this.runs.read(),usage=await this.usage.read(),participants=[];for(const participant of this.participants)participants.push({registration:participant.registration,reference:await participant.capture(run,context)});if(!await lease.assertHeld()||same(run)!==same(await this.runs.read())||same(usage)!==same(await this.usage.read()))throw new ExecutionRecoveryError();const reference=await this.artifacts.save(run,usage,this.ids.nextId(),lease.proofRef,participants,context.signal);if(!await lease.assertHeld())throw new ExecutionRecoveryError();if(run.outcome===null)await this.runs.mutate(value=>value.recoveryCheckpoint(owner,run.revision,"artifact:"+reference.artifactId));return reference;}finally{await lease.release();}}
}
```

### `workflows/recovery/WorkflowRecoveryCoordinator.ts`

Reconciles known outcomes, existing usage reservations and pending effects under a held barrier. Unknowns block with work retained. It validates optional older checkpoint hints against current immutable bindings, restores matching participants without paid calls, and atomically records resume/stop before releasing ownership. Recovery never resets counters or extends the task deadline.

```typescript
import type { IWorkflowRunStore } from "../IWorkflowRunStore";
import type { IUsageLedgerStore } from "../../usage/IUsageLedgerStore";
import type { IRecoveryBarrier } from "./IRecoveryBarrier";
import type { IRecoveryLease } from "./IRecoveryLease";
import type { IAttemptRecoverySource } from "./IAttemptRecoverySource";
import type { IEffectRecoverySource } from "./IEffectRecoverySource";
import type { IUsageRecoverySource } from "./IUsageRecoverySource";
import type { ICheckpointParticipant } from "./ICheckpointParticipant";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator";
import type { IClock } from "../../contracts/runtime/IClock";
import type { WorkflowRecoveryOutcome } from "./WorkflowRecoveryOutcome";
import type { ArtifactRef } from "../../artifacts/ArtifactRef";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import { ExecutionOutcomeContract } from "../../contracts/validation/ExecutionOutcomeContract";
import { RecoveryEvidenceStore } from "./RecoveryEvidenceStore";
import { ExecutionCheckpointStore } from "./ExecutionCheckpointStore";
import { canonicalWorkflowValue as same } from "../canonicalWorkflowValue";
import { ExecutionRecoveryError } from "../../errors/ExecutionRecoveryError";
export class WorkflowRecoveryCoordinator{
 constructor(private readonly runs:IWorkflowRunStore,private readonly usage:IUsageLedgerStore,private readonly barrier:IRecoveryBarrier,private readonly attempts:IAttemptRecoverySource,private readonly effects:IEffectRecoverySource,private readonly counters:IUsageRecoverySource,private readonly evidence:RecoveryEvidenceStore,private readonly checkpoints:ExecutionCheckpointStore,private readonly participants:readonly ICheckpointParticipant[],private readonly outcomes:ExecutionOutcomeContract<JsonValue>,private readonly ids:IIdGenerator,private readonly clock:IClock){}
 async recover(context:IExecutionContext,checkpoint?:ArtifactRef):Promise<WorkflowRecoveryOutcome>{
  const observed=await this.runs.read(),commandId=context.identity.operationId;if(context.identity.runId!==observed.runId||same(context.scope)!==same(observed.scope)||!/^[A-Za-z0-9_.:-]{1,128}$/.test(commandId))throw new ExecutionRecoveryError();const previous=observed.recoveries.find(item=>item.commandId===commandId);if(previous!==undefined)return {status:"recorded",record:previous};if(observed.outcome!==null)return this.block("RUN_ALREADY_TERMINAL");const lease=await this.barrier.acquire(observed,context);if(lease===null)return this.block("RECOVERY_BARRIER_UNAVAILABLE");
  try{
   if(lease.runId!==observed.runId||same(lease.scope)!==same(observed.scope)||lease.previousOwnerToken!==(observed.engineOwner?.ownerToken??null))throw new ExecutionRecoveryError();await this.held(lease,context);const owner=this.ids.nextId();await this.runs.mutate(run=>run.fenceRecovery(observed.revision,lease.previousOwnerToken,owner,lease.proofRef));
   if(checkpoint!==undefined){const saved=await this.checkpoints.read(checkpoint,observed.scope,context.signal),current=await this.runs.read();if(saved.run.runId!==current.runId||saved.run.revision>current.revision||same([saved.run.definition,saved.run.request,saved.run.completionPolicy,saved.run.budgetScopeId,saved.run.deadlineEpochMs])!==same([current.definition,current.request,current.completionPolicy,current.budgetScopeId,current.deadlineEpochMs]))throw new ExecutionRecoveryError();if(saved.manifest.participants.length!==this.participants.length)return this.block("CHECKPOINT_PARTICIPANTS_MISMATCH");for(const participant of this.participants){const item=saved.manifest.participants.find(item=>same(item.registration)===same(participant.registration));if(item===undefined||!await participant.restore(item.reference,current,context))return this.block("CHECKPOINT_RESTORE_UNAVAILABLE");}}
   for(const attempt of (await this.runs.read()).attempts.filter(item=>item.stage==="dispatching")){const run=await this.runs.read(),known=await this.attempts.read(attempt,run,context);if(known.status==="unknown")continue;const checked=await this.outcomes.validate(known.value);if(!checked.valid)throw new ExecutionRecoveryError();await this.evidence.save(run.runId,attempt.claim.operationId,checked.value,known.evidenceRefs,context.signal);await this.held(lease,context);await this.runs.mutate(value=>value.recoverKnownOutcome(owner,attempt.claim.attemptId,checked.value));}
   for(const reservation of (await this.usage.read()).reservations.filter(item=>item.status!=="settled")){const run=await this.runs.read(),known=await this.counters.read(reservation,run,context);if(known.status==="unknown")continue;const keys=["modelCalls","inputTokens","outputTokens","toolCalls","iterations","fixes"];if(known.value===null||typeof known.value!=="object"||Object.keys(known.value).length!==6||!keys.every(key=>Number.isSafeInteger(known.value[key as keyof typeof known.value])&&known.value[key as keyof typeof known.value]>=0))throw new ExecutionRecoveryError();await this.evidence.save(run.runId,reservation.operationId,known.value,known.evidenceRefs,context.signal);await this.held(lease,context);await this.usage.mutate(ledger=>ledger.settle(reservation.operationId,known.value));}
   const planned=(await this.runs.read()).transitionPlan;if(planned!==null){const reservation=(await this.usage.read()).reservations.find(item=>item.operationId===planned.operationId);if(reservation!==undefined&&reservation.status!=="settled")return this.block("CORRECTION_USAGE_UNKNOWN");const actual=reservation?.actual;if(actual!==undefined&&actual!==null&&(actual.modelCalls!==0||actual.inputTokens!==0||actual.outputTokens!==0||actual.toolCalls!==0||actual.iterations!==0||![0,1].includes(actual.fixes)))throw new ExecutionRecoveryError();await this.evidence.save(observed.runId,planned.operationId,{apply:actual?.fixes===1},[lease.proofRef],context.signal);await this.held(lease,context);await this.runs.mutate(run=>run.recoverCorrection(owner,actual?.fixes===1));}
   const latest=await this.runs.read();for(const ref of latest.lifecycle.pendingOperationRefs){if(latest.attempts.some(item=>item.stage==="dispatching"&&item.claim.operationId===ref))continue;const known=await this.effects.read(ref,latest,context);if(known.status==="unknown")continue;if(known.value.settled!==true)throw new ExecutionRecoveryError();const receipt=await this.evidence.save(latest.runId,ref,known.value,known.evidenceRefs,context.signal);await this.held(lease,context);await this.runs.mutate(run=>run.acknowledgeEffect(owner,ref,receipt));}
   if((await this.usage.read()).reservations.some(item=>item.status!=="settled"))return this.block("USAGE_REMAINS_UNKNOWN");if((await this.runs.read()).lifecycle.pendingOperationRefs.length>0)return this.block("EFFECTS_REMAIN_UNKNOWN");await this.held(lease,context);
   const record=await this.runs.mutate(run=>{const state=run.snapshot(),cancelled=state.lifecycle.cancellationRequested,expired=state.deadlineEpochMs!==null&&this.clock.nowEpochMs()>=state.deadlineEpochMs;return run.finishRecovery(owner,commandId,!cancelled&&!expired,cancelled?{code:"cancelled",message:"Cancellation requested."}:expired?{code:"deadline-reached",message:"Original task deadline reached."}:null);});return {status:"recorded",record};
  }finally{await lease.release();}
 }
 private async held(lease:IRecoveryLease,context:IExecutionContext):Promise<void>{if(context.signal.aborted||(context.deadlineEpochMs!==null&&this.clock.nowEpochMs()>=context.deadlineEpochMs)||!await lease.assertHeld())throw new ExecutionRecoveryError();}
 private async block(code:string):Promise<WorkflowRecoveryOutcome>{return {status:"blocked",code,pendingOperationRefs:(await this.runs.read()).lifecycle.pendingOperationRefs};}
}
```

### `examples/workflows/recoverLoginWorkflowExample.ts`

Shows the caller flow after an interrupted login.ts editing workflow. Host adapters must first prove the previous editor and children stopped and provide actual receipts. Unknown effects return blocked; a successful resumed receipt permits the normal engine to continue with existing input, results and budgets.

```typescript
import type { IExecutionContext, WorkflowRecoveryOutcome, WorkflowEngineOutcome, ArtifactRef } from "../../index";
import { WorkflowRecoveryCoordinator, WorkflowEngine } from "../../index";
export async function recoverLoginWorkflowExample(recovery:WorkflowRecoveryCoordinator,engine:WorkflowEngine,administrativeContext:IExecutionContext,taskContext:IExecutionContext,checkpoint?:ArtifactRef):Promise<WorkflowRecoveryOutcome|WorkflowEngineOutcome>{
 const recovered=await recovery.recover(administrativeContext,checkpoint);
 if(recovered.status==="blocked")return recovered;
 // A stopped recovery is already terminal; run() presents its retained partial outcome.
 // A resumed recovery continues through the same engine and original controls.
 return engine.run(taskContext);
}
```

### `index.ts`

Append these exports to the existing public barrel. Replaced files keep their earlier exports.

```typescript
export * from "./errors/ExecutionRecoveryError";
export * from "./workflows/recovery/OperationReconciliation";
export * from "./workflows/recovery/WorkflowRecoveryRecord";
export * from "./workflows/recovery/IRecoveryLease";
export * from "./workflows/recovery/IRecoveryBarrier";
export * from "./workflows/recovery/RunAbortRegistry";
export * from "./workflows/recovery/WorkflowCancellationService";
export * from "./workflows/recovery/RecoveryObservation";
export * from "./workflows/recovery/IAttemptRecoverySource";
export * from "./workflows/recovery/IEffectRecoverySource";
export * from "./workflows/recovery/IUsageRecoverySource";
export * from "./workflows/recovery/RecoveryEvidenceStore";
export * from "./workflows/recovery/ICheckpointParticipant";
export * from "./workflows/recovery/ExecutionCheckpointManifest";
export * from "./workflows/recovery/WorkflowRecoveryOutcome";
export * from "./workflows/recovery/RecoveryFence";
export * from "./workflows/recovery/WorkflowRecoverySchemaMigrator";
export * from "./workflows/recovery/ExecutionCheckpointStore";
export * from "./workflows/recovery/WorkflowCheckpointCoordinator";
export * from "./workflows/recovery/WorkflowRecoveryCoordinator";
export * from "./examples/workflows/recoverLoginWorkflowExample";
```

