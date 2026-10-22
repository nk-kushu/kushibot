# 23. WorkflowEngine and Transitions

## What We Implement Here

Implement the sequential WorkflowEngine and the WorkflowRun/StepRun aggregates around the existing StepRunner. Provide a concrete SQLite/PostgreSQL run store and owner-bound step journal so attempt outcomes, acceptance receipts and current accepted dependencies commit together. Add bounded, normally budgeted correction transitions with transitive result invalidation, independent final workflow acceptance, and honest stopped/pending outcomes that preserve collected work. Full effect recovery remains page 24.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `errors/WorkflowRunError.ts` | `class WorkflowRunError extends Error` |
| `workflows/WorkflowResult.ts` | `type WorkflowResult` |
| `workflows/StepRunSnapshot.ts` | `type StepRunSnapshot` |
| `workflows/WorkflowStepAttempt.ts` | `type WorkflowStepAttempt` |
| `workflows/WorkflowTransitionRecord.ts` | `type WorkflowTransitionRecord` |
| `workflows/WorkflowTransitionPlan.ts` | `type WorkflowTransitionPlan` |
| `workflows/WorkflowRunSnapshot.ts` | `type WorkflowRunSnapshot` |
| `workflows/WorkflowEngineOutcome.ts` | `type WorkflowEngineOutcome` |
| `workflows/WorkflowTransitionInput.ts` | `type WorkflowTransitionInput` |
| `workflows/WorkflowTransitionDecision.ts` | `type WorkflowTransitionDecision` |
| `workflows/WorkflowCompletionInput.ts` | `type WorkflowCompletionInput` |
| `workflows/WorkflowCompletionDecision.ts` | `type WorkflowCompletionDecision` |
| `workflows/StepContextEvidenceInput.ts` | `type StepContextEvidenceInput` |
| `workflows/canonicalWorkflowValue.ts` | `function canonicalWorkflowValue` |
| `workflows/collectWorkflowPartial.ts` | `function collectWorkflowPartial` |
| `workflows/StepRun.ts` | `class StepRun` |
| `workflows/WorkflowRun.ts` | `class WorkflowRun` |
| `workflows/IWorkflowRunStore.ts` | `interface IWorkflowRunStore` |
| `workflows/WorkflowRunSnapshotContract.ts` | `class WorkflowRunSnapshotContract implements IResultContract<WorkflowRunSnapshot>` |
| `workflows/WorkflowRunStatements.ts` | `type WorkflowRunStatements` |
| `workflows/sqliteWorkflowRunStatements.ts` | `const sqliteWorkflowRunStatements` |
| `workflows/postgresqlWorkflowRunStatements.ts` | `const postgresqlWorkflowRunStatements` |
| `workflows/SqlWorkflowRunStore.ts` | `class SqlWorkflowRunStore implements IWorkflowRunStore` |
| `workflows/WorkflowStepAttemptJournal.ts` | `class WorkflowStepAttemptJournal implements IStepAttemptJournal` |
| `workflows/WorkflowStepContextVerifier.ts` | `class WorkflowStepContextVerifier implements IStepContextVerifier` |
| `workflows/IWorkflowStepRunnerFactory.ts` | `interface IWorkflowStepRunnerFactory` |
| `workflows/WorkflowStepRunnerFactory.ts` | `class WorkflowStepRunnerFactory implements IWorkflowStepRunnerFactory` |
| `workflows/WorkflowPolicyRegistry.ts` | `class WorkflowPolicyRegistry` |
| `workflows/WorkflowEngine.ts` | `class WorkflowEngine` |
| `examples/workflows/FailedLoginVerificationTransitionPolicy.ts` | `class FailedLoginVerificationTransitionPolicy implements IPolicy<WorkflowTransitionInput, WorkflowTransitionDecision>` |
| `examples/workflows/LoginWorkflowCompletionPolicy.ts` | `class LoginWorkflowCompletionPolicy implements IPolicy<WorkflowCompletionInput, WorkflowCompletionDecision>` |
| `examples/workflows/createLoginCorrectionDefinition.ts` | `function createLoginCorrectionDefinition` |
| `examples/workflows/createWorkflowRunStoreExample.ts` | `function createWorkflowRunStoreExample` |
| `examples/workflows/createLoginWorkflowEngineExample.ts` | `function createLoginWorkflowEngineExample` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [page 01](01-scope-and-implementation-roadmap.md) and [page 02](02-package-structure-and-oop-conventions.md) for general OOP/naming/writing rules. Each class/interface has its own matching file and interfaces begin with `I`. Reuse page-05 lifecycle definitions, page-06 SQL/codec patterns, shared `IPolicy`, page-09 usage, and pages 21–22 executors/StepRunner rather than introducing replacement runtimes. These Notes files specify future source; editing this page does not install a library.
- WorkflowEngine owns sequential ready-step coordination; WorkflowRun owns run-wide admission/acceptance/transition invariants; StepRun owns a concrete execution lifecycle; StepRunner owns one admitted attempt. Registered executors still do the actual task. Definitions remain immutable reusable JSON. The full exact definition, original request, scope, budget scope, run deadline and final-completion policy version are pinned in the run aggregate at initialization.
- The initial engine supports a dependency DAG and explicitly bounded correction/revisit edges. It does not use transitions as arbitrary forward jumps around required dependencies. A chosen correction target must be the trigger step or one of its dependency ancestors, and must already have an execution. Transition declarations are evaluated in definition order; the first take=true wins. A recorded null choice means no correction for that receipt. No other step, executor, target or source scope can be invented by a policy.
- Default execution is sequential, with one durable engine owner and one current step attempt. Pure transition/final acceptance policies execute outside SQL transactions through exact versioned `IPolicy` registrations. They return bounded decisions only and perform no model/tool/effect work. Engine ownership has no time-based expiry or automatic takeover. Duplicate/concurrent engine invocation returns a saved terminal outcome, pending state, or busy; it never acquires a second permission to dispatch. Crash recovery and explicit ownership transfer belong to page 24.
- `StepRun` reuses `ExecutionLifecycle` and the existing step-run profile; WorkflowRun reuses the workflow-run profile. Pending effects prevent terminal transitions. Invalidating a completed execution marks its historical record and removes its result from the current accepted set; it does not rewrite its accepted receipt or reopen a terminal lifecycle. A fresh execution/fix gets a fresh stepRunId. The initial engine admits one attempt per concrete execution; aggregate logical-step/run caps span all generations and cannot be reset by new IDs.
- The production journal is `WorkflowStepAttemptJournal` over `SqlWorkflowRunStore`. It implements page 22’s exact interface. One locked aggregate update records the raw outcome, receipt, concrete step lifecycle and current accepted-result exposure; dependent reads use that same authoritative aggregate. It does not call public ExecutionRecordRepository.save inside another transaction. Page-06 generic records may be explicit projections/read models, not a second competing authority. Any future projection/outbox must participate in the owning transaction; no external message publication is implemented here.
- The SQL row is keyed by scope/project/run; workspace and complete immutable configuration are additionally verified in the payload binding. Startup creates only `kushibot_workflow_runs_v1` under the existing migrationTransaction contract and inserts with ON CONFLICT DO NOTHING. Restart validates existing exact binding and never resets ownership, attempts, accepted results, fixes or usage. Changing a definition, request, policy version, deadline, scope or budget binding requires an explicitly new run or a future supported migration, not initialize-overwrite.
- SQLite and PostgreSQL use parameterized statements and a transaction-held no-op row-update lock. The database implementation must normalize affectedRows and pin one connection for the transaction. Decode/validate/restore, synchronous domain mutation and encode/update occur inside that short lock. Only bounded clock/signal observations needed at commit are read inside mutation callbacks; no model/provider/tool, asynchronous policy, source read, sleep or ID generation occurs there. Async/thenable callbacks are rejected. SQL/network failures remain observable; a return is not a durable receipt until commit succeeds.
- `WorkflowRunSnapshotContract` validates finite JSON, nested definitions/views/receipts/outcomes and existing lifecycles, then cross-checks identity/attempt/accepted-result links, historical dependency receipts, pending operations and terminal consistency. Use JsonRecordCodec with a 2-MiB cap; the existing finite-JSON node/depth limit also applies. The original request and each prepared input cap at 64 KiB. Retaining repeated bounded history can hit storage bounds before numeric attempt caps. Fail before undisclosed dispatch or acceptance, preserve the last durable state, and use authorized artifacts/checkpoints or a later explicit normalized-storage migration for larger runs. Never prune receipts to bypass limits.
- Current step views use a dependency revision that advances only when the accepted set changes, not on prepare/dispatch/outcome bookkeeping. This avoids invalidating an attempt with its own write-ahead saves. `WorkflowStepContextVerifier` checks the exact aggregate/definition/scope/view and then invokes a required trusted source-evidence policy. The host must authorize real sources, artifacts, receipts, model/tool scopes and freshness; a matching scope string or fixture returning true is not security. The aggregate closes run/dependency CAS races, not an imaginary atomic transaction with all external ACL/file systems. External snapshot/provenance versions and workspace CAS remain mandatory.
- Step admission rechecks exact command content, declared ready dependencies, the current selected StepRun, pending work, per-logical-step and total attempt caps. Only a new claim can dispatch; existing claims return their saved receipt or pending operation. Prepared input is saved before beginDispatch records the invocation pending in both step/run lifecycles. Known outcomes reconcile that invocation and retain any explicitly unresolved child/tool/provider references. Candidate storage precedes acceptance; a crash-like acceptance failure leaves the candidate saved without authorizing another executor call.
- Commit atomically checks active owner, exact attempt/context binding, controls, dependency view and pending operations before accepting. It may downgrade a requested acceptance to not-evaluated, never upgrade rejection/not-evaluated to accepted. Only an accepted completed receipt enters the current dependency set. Rejected/stopped/failed and not-evaluated results remain historical work; semantic rejection is not rewritten as a fake executor failure. Known failed steps without a declared correction fail the workflow; known stopped or unaccepted work without a usable path stops it explicitly.
- A verification step can be an accepted checking task with passed:false when its criterion is to run and record checks. The saved result then drives a declared correction. Workflow completion is a separate mandatory policy and must not equate every step being accepted with the user goal being achieved. Final acceptance/rejection, its pinned policy version and the resulting run outcome are retained. The login completion example requires both configured checks, verified passing receipts and exact final editing/verification snapshot agreement; applications must also encode all other original goal/security criteria.
- Correction is not automatic retry of an uncertain effect. First persist a plan with its unique fix-operation ID. Then reserve/settle one normal `fixes` unit in the original shared ledger, and only then atomically apply the plan. The usage ledger and run aggregate are separate transactions: a crash between them leaves a conservative pending plan. A replayed reservation is not permission to apply it again. No extra ledger, free fallback inference, reset allowance or unbounded repair loop is introduced. Model/tool/iteration charges stay inside the existing executors and their descendants.
- A committed correction invalidates the target and all transitive dependency descendants, removes only those current accepted results, increments dependency revision and retains every old input, outcome, receipt and source reference. Unaffected predecessors remain accepted. New ready executions use those current accepted dependencies and current authorized workspace snapshots. Check transition traversal, affected step-attempt caps and enough remaining total attempts before staging. Cancellation after a fix charge may leave the plan pending; returning does not mean the plan, charge or file effects were undone.
- In the login example, investigate and specify finish once; edit produces snapshot 1; verify records a failed expiry check. The declared verify→edit correction charges one fix, invalidates current edit/verify results, and creates fresh executions. Edit produces snapshot 2 and verification checks exactly snapshot 2. Earlier receipts remain in history. After independent final acceptance, the run completes with four current accepted results and six historical attempts. Separate sessions still do not isolate files; editing keeps page-14 sequential scope/CAS rules and nothing here publishes changes.
- Cancellation/deadline is checked before work, around policy/ledger boundaries, by StepRunner/executors, and at acceptance commit. An earlier host deadline narrows the pinned run deadline. With unresolved operations, return pending and keep a nonterminal interrupted/stopping lifecycle. Known no-pending cancellation may become cancelled with a stopped outcome. Pending reservations, provider usage, spawned children and writes require actual reconciliation; no timeout-based release, terminal-success shortcut or automatic engine takeover exists in this phase.
- A pending engine outcome exposes all retained operation references and a bounded partial pointer to the authoritative run record; it never truncates pending IDs to fit a friendly message. A busy engine outcome means another owner exists without enough current pending data to represent its progress, not permission to rerun. The scoped workflow-run/workflow-result/step-receipt locators resolve through authorized aggregate readers; they are not invented claims that ArtifactStore was written separately. All detailed accepted/partial/unresolved state remains durably reachable in the aggregate.
- The store’s read/initialize capability is trusted application composition. Public engine entry validates scope/run/identity against that capability, but does not replace host authentication or tenant authorization. Real executor session providers, source/evidence readers, check tools and receipt verification remain the earlier required integrations. The public examples use injected capabilities and contain no always-accept production evidence fallback, arbitrary shell/process launcher or paid model call. Provider prompt caching still comes from stable composer/provider adapters inside ordinary agent executors, never a cached workflow answer.
- Ownership fencing prevents a second engine from acting; required store errors and unexpected policy/StepRunner/executor exceptions propagate with the last durable stage intact. Recovery may reconcile effects/usage, finish acceptance or release ownership under explicit page-24 rules. This page does not implement queue delivery, distributed notification/outbox processing, checkpoint restoration, native workspace isolation, memory, human approval or publication. Optional logs use safe IDs/status/counts; required aggregate/usage/evidence records remain active when logging is disabled.
- Verify ordinary ready ordering, exact definition/command bindings, fresh concrete executions, duplicate owner/command protection, accepted-result atomicity, candidate retention, transition policy order, bounded correction and transitive invalidation, one shared fix charge, completion rejection, cancellation/pending nonterminal states, restart preservation and rollback. Use a real SQLite adapter for SQL round-trip/transaction tests and offline executors for deterministic orchestration. PostgreSQL statement parity is not PostgreSQL locking integration evidence; run that adapter’s actual concurrency suite before a production guarantee. Complete recovery/tenant/process/provider guarantees require their own owning-phase integration evidence.

## TypeScript Code for Each File

### `errors/WorkflowRunError.ts`

Reports invalid run state, owner/command identity, aggregate bindings or stale decisions without logging request/source content.

```typescript
export class WorkflowRunError extends Error { readonly code="WORKFLOW_RUN_INVALID";constructor(){super("Workflow run state, binding, owner, or decision is invalid.");this.name="WorkflowRunError";} }
```

### `workflows/WorkflowResult.ts`

Returns only currently accepted step results. Superseded correction attempts remain in run history rather than appearing as current results.

```typescript
import type { AcceptedStepResult } from "./AcceptedStepResult";
export type WorkflowResult=Readonly<{runId:string;results:readonly AcceptedStepResult[]}>;
```

### `workflows/StepRunSnapshot.ts`

Records one actual step execution/fix using the existing lifecycle. Invalidating a completed execution never rewrites or reopens its historical lifecycle.

```typescript
import type { LifecycleSnapshot } from "../domain/lifecycle/LifecycleSnapshot";
export type StepRunSnapshot=Readonly<{stepId:string;stepRunId:string;invalidated:boolean;attemptId:string|null;lifecycle:LifecycleSnapshot}>;
```

### `workflows/WorkflowStepAttempt.ts`

Keeps write-ahead stage, prepared input, raw candidate/outcome and acceptance receipt in the same authoritative aggregate. The initial engine uses one attempt per concrete StepRun and counts all attempts per logical step.

```typescript
import type { StepAttemptClaim } from "./StepAttemptClaim";
import type { StepAttemptReceipt } from "./StepAttemptReceipt";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { JsonValue } from "../contracts/persistence/JsonValue";
export type WorkflowStepAttempt=Readonly<{claim:StepAttemptClaim;attemptNumber:number;stage:"claimed"|"prepared"|"dispatching"|"outcome"|"committed";input:JsonValue|null;outcome:ExecutionOutcome<JsonValue>|null;receipt:StepAttemptReceipt|null}>;
```

### `workflows/WorkflowTransitionRecord.ts`

Marks a receipt’s transition decision as consumed exactly once. A null transition is an explicit no-correction decision; a chosen correction retains its normally charged fix operation ID.

```typescript
export type WorkflowTransitionRecord=Readonly<{triggerAttemptId:string;transitionId:string|null;fixOperationId:string|null}>;
```

### `workflows/WorkflowTransitionPlan.ts`

Persists a correction decision before touching the separate usage ledger. A crash in this gap remains pending and requires recovery; a ledger replay is not fresh permission to apply it.

```typescript
export type WorkflowTransitionPlan=Readonly<{triggerAttemptId:string;transitionId:string;operationId:string}>;
```

### `workflows/WorkflowRunSnapshot.ts`

Is the versioned source of truth for one bounded scoped workflow run, including its full pinned definition, lifecycles, attempts, current accepted results and transition history.

```typescript
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
  schemaVersion:1;revision:number;dependencyRevision:number;runId:string;scope:ExecutionScopeRef;
  definition:WorkflowDefinition;request:JsonValue;completionPolicy:RegistrationRef;budgetScopeId:string;deadlineEpochMs:number|null;
  lifecycle:LifecycleSnapshot;engineOwner:Readonly<{commandId:string;ownerToken:string}>|null;
  steps:readonly StepRunSnapshot[];attempts:readonly WorkflowStepAttempt[];accepted:readonly AcceptedStepResult[];
  transitions:readonly WorkflowTransitionRecord[];transitionPlan:WorkflowTransitionPlan|null;completionDecision:WorkflowCompletionDecision|null;outcome:ExecutionOutcome<WorkflowResult>|null;
}>;
```

### `workflows/WorkflowEngineOutcome.ts`

Separates a durably finished run from an unresolved run or an invocation already owned by another engine. Pending effects never become a terminal lifecycle merely because the caller returned.

```typescript
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { PartialProgress } from "../contracts/outcomes/PartialProgress";
import type { WorkflowResult } from "./WorkflowResult";
export type WorkflowEngineOutcome=Readonly<{status:"finished";outcome:ExecutionOutcome<WorkflowResult>}>|Readonly<{status:"pending";runId:string;partial:PartialProgress;pendingOperationRefs:readonly string[]}>|Readonly<{status:"busy";runId:string}>;
```

### `workflows/WorkflowTransitionInput.ts`

Supplies a saved trigger receipt and immutable current run data to a registered deterministic transition policy. Live execution controls are supplied separately from persisted data.

```typescript
import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot";
import type { StepAttemptReceipt } from "./StepAttemptReceipt";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export type WorkflowTransitionInput=Readonly<{run:WorkflowRunSnapshot;trigger:StepAttemptReceipt;execution:IExecutionContext}>;
```

### `workflows/WorkflowTransitionDecision.ts`

Offers only take/skip; the policy cannot choose an undeclared target, alter caps, replace dependencies or perform the correction itself.

```typescript
export type WorkflowTransitionDecision=Readonly<{take:boolean}>;
```

### `workflows/WorkflowCompletionInput.ts`

Supplies all current accepted results and the original pinned goal to independent workflow-level acceptance. All steps being accepted is necessary, but does not itself prove the user’s goal.

```typescript
import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export type WorkflowCompletionInput=Readonly<{run:WorkflowRunSnapshot;execution:IExecutionContext}>;
```

### `workflows/WorkflowCompletionDecision.ts`

Accepts the final goal or returns a bounded reason why the retained results remain insufficient.

```typescript
export type WorkflowCompletionDecision=Readonly<{accepted:true}>|Readonly<{accepted:false;code:string;message:string}>;
```

### `workflows/StepContextEvidenceInput.ts`

Gives the trusted deterministic evidence policy the exact run/view and live scoped controls. It must verify authorized source/receipt content and freshness beyond the aggregate’s dependency checks.

```typescript
import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot";
import type { StepInputPolicyInput } from "./StepInputPolicyInput";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export type StepContextEvidenceInput=Readonly<{run:WorkflowRunSnapshot;view:StepInputPolicyInput;execution:IExecutionContext}>;
```

### `workflows/canonicalWorkflowValue.ts`

Provides deterministic finite-JSON comparison for definition, command and aggregate bindings. Callers validate JSON first; this is comparison plumbing, not authorization or a cryptographic digest.

```typescript
export function canonicalWorkflowValue(value:unknown):string{return JSON.stringify(value,(_key,item:unknown)=>item!==null&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([left],[right])=>left<right?-1:left>right?1:0)):item);}
```

### `workflows/collectWorkflowPartial.ts`

Keeps a bounded pointer to the complete authoritative run instead of silently dropping accumulated results to fit a short partial summary. The reference is a scoped aggregate locator, not an artifact claimed to have been written elsewhere.

```typescript
import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot";
import type { PartialProgress } from "../contracts/outcomes/PartialProgress";
export function collectWorkflowPartial(run:WorkflowRunSnapshot):PartialProgress{return Object.freeze({summary:run.accepted.length+" accepted step results retained from "+run.attempts.length+" admitted attempts.",evidenceRefs:Object.freeze(["workflow-run:"+run.runId]),artifactRefs:Object.freeze([]),unresolved:Object.freeze([run.accepted.length===run.definition.steps.length?"Workflow-level goal acceptance is incomplete; inspect saved outcomes, controls and transition state.":run.definition.steps.length-run.accepted.length+" steps remain unaccepted; inspect the retained run record."])});}
```

### `workflows/StepRun.ts`

Encapsulates one concrete step lifecycle and its invalidation marker. It reuses page-05 transitions and refuses terminal completion while known operations remain pending.

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
  close(receipt:StepAttemptReceipt):void{
    if(receipt.attemptId!==this.state.attemptId)throw new WorkflowRunError();
    if(this.lifecycle.snapshot().pendingOperationRefs.length>0){this.lifecycle.transition("interrupted");return;}
    if(receipt.acceptance.status==="accepted"){this.lifecycle.transition("completed",{acceptedResultRef:receipt.receiptRef});return;}
    if(receipt.outcome.status==="failed"){this.lifecycle.transition("failed");return;}
    if(receipt.outcome.status==="stopped"&&receipt.outcome.reason.code==="cancelled"){this.lifecycle.requestCancellation();this.lifecycle.transition("cancelled");return;}
    this.lifecycle.transition("stopped");
  }
  invalidate():void{if(this.lifecycle.snapshot().pendingOperationRefs.length>0)throw new WorkflowRunError();this.state=Object.freeze({...this.state,invalidated:true});}
}
```

### `workflows/WorkflowRun.ts`

Owns readiness, attempt admission, write-ahead state, accepted-result exposure, correction invalidation and final run lifecycle. Its methods are pure aggregate mutations used under the store’s short transaction lock.

```typescript
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
    return Object.freeze({...input,schemaVersion:1 as const,revision:0,dependencyRevision:0,lifecycle:ExecutionLifecycle.create(workflowRunLifecycle,input.runId).snapshot(),engineOwner:null,steps:Object.freeze([]),attempts:Object.freeze([]),accepted:Object.freeze([]),transitions:Object.freeze([]),transitionPlan:null,completionDecision:null,outcome:null});
  }
  static async restore(snapshot:WorkflowRunSnapshot):Promise<WorkflowRun>{const run=new WorkflowRun(snapshot,await ExecutionLifecycle.restore(workflowRunLifecycle,snapshot.lifecycle));for(const state of snapshot.steps)run.steps.set(state.stepRunId,await StepRun.restore(state));run.audit();return run;}
  snapshot():WorkflowRunSnapshot{return Object.freeze({...this.state,lifecycle:this.lifecycle.snapshot(),steps:Object.freeze([...this.steps.values()].map(step=>step.snapshot()))});}
  acquire(commandId:string,ownerToken:string):boolean{if(this.state.outcome!==null||
        this.state.engineOwner!==null)return false;this.lifecycle.transition("active");this.state=Object.freeze({...this.state,engineOwner:Object.freeze({commandId,ownerToken})});this.bump();return true;}
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
    const attempt=this.ownedAttempt(owner,attemptId,token);if(attempt.outcome!==null){if(same(attempt.outcome)!==same(outcome))throw new WorkflowRunError();return;}
    if(attempt.stage!=="dispatching"&&outcome.status==="completed")throw new WorkflowRunError();const step=this.steps.get(attempt.claim.stepRunId)!;
    if(attempt.stage==="dispatching"){this.lifecycle.recordReconciledOperation(attempt.claim.operationId);step.reconciled(attempt.claim.operationId);}
    if(outcome.status!=="completed")for(const ref of outcome.pendingOperationRefs){this.lifecycle.recordPendingOperation(ref);step.pending(ref);}
    this.replace({...attempt,outcome,stage:"outcome"});
  }
  commit(owner:string,attemptId:string,token:string,acceptance:StepResultAcceptance,context:IExecutionContext,now:number):StepAttemptReceipt{
    const attempt=this.ownedAttempt(owner,attemptId,token);if(attempt.receipt!==null)return attempt.receipt;if(attempt.outcome===null)throw new WorkflowRunError();
    if(context.identity.runId!==this.state.runId||
        context.identity.stepRunId!==attempt.claim.stepRunId||
        context.identity.operationId!==attempt.claim.operationId||
        same(context.scope)!==same(this.state.scope))throw new WorkflowRunError();
    let decision=acceptance;if(decision.status==="accepted"&&(context.signal.aborted||
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
  private owner(token:string):void{if(this.state.engineOwner?.ownerToken!==token||this.lifecycle.snapshot().status!=="active")throw new WorkflowRunError();}
  private expected(revision:number):void{if(this.state.revision!==revision)throw new WorkflowRunError();}
  private activeStep(stepId:string):StepRun|null{return [...this.steps.values()].find(step=>step.snapshot().stepId===stepId&&!step.snapshot().invalidated)??null;}
  private definitionStep(stepId:string):StepDefinition{const step=this.state.definition.steps.find(item=>item.id===stepId);if(step===undefined)throw new WorkflowRunError();return step;}
  private ownedAttempt(owner:string,attemptId:string,token:string):WorkflowStepAttempt{this.owner(owner);const attempt=this.state.attempts.find(item=>item.claim.attemptId===attemptId);if(attempt===undefined||
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
      const pending=attempt.stage==="dispatching"?[claim.operationId]:attempt.outcome!==null&&attempt.outcome.status!=="completed"?attempt.outcome.pendingOperationRefs:[];
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
    for(const execution of this.state.steps)if(execution.attemptId===null&&execution.lifecycle.status!=="created"||
        execution.attemptId!==null&&!this.state.attempts.some(attempt=>attempt.claim.attemptId===execution.attemptId&&attempt.claim.stepRunId===execution.stepRunId))throw new WorkflowRunError();
    for(const record of this.state.transitions){const trigger=this.state.attempts.find(attempt=>attempt.claim.attemptId===record.triggerAttemptId)?.receipt;if(trigger===undefined||
        trigger===null)throw new WorkflowRunError();if(record.transitionId!==null){const transition=this.state.definition.transitions.find(item=>item.id===record.transitionId);if(transition===undefined||
        transition.fromStepId!==trigger.stepId||
        !this.affected(transition.toStepId).includes(trigger.stepId))throw new WorkflowRunError();}}
    if(this.state.transitionPlan!==null){expectedPending.add(this.state.transitionPlan.operationId);if(this.unprocessed()?.attemptId!==this.state.transitionPlan.triggerAttemptId)throw new WorkflowRunError();}
    if(same([...expectedPending].sort())!==same([...this.lifecycle.snapshot().pendingOperationRefs].sort()))throw new WorkflowRunError();
    const status=this.lifecycle.snapshot().status;
    if(this.state.engineOwner===null&&(status!=="created"||
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

### `workflows/IWorkflowRunStore.ts`

Provides scoped immutable reads and atomic pure aggregate mutations. Async policy/provider/tool work is forbidden inside mutate; initialization never replaces an existing run.

```typescript
import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot";
import type { WorkflowRun } from "./WorkflowRun";
export interface IWorkflowRunStore{initialize(initial:WorkflowRunSnapshot):Promise<void>;read():Promise<WorkflowRunSnapshot>;mutate<T>(change:(run:WorkflowRun)=>T):Promise<T>;}
```

### `workflows/WorkflowRunSnapshotContract.ts`

Validates the versioned SQL payload, nested definitions/views/outcomes/receipts and lifecycle snapshots, then restores the aggregate to verify cross-record invariants. Finite-JSON bounds apply to the whole retained history.

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
  readonly id="workflow-run-aggregate";readonly version="1";
  constructor(private readonly json:JsonValueContract,
    private readonly definitions:WorkflowDefinitionContract,
    private readonly views:StepInputPolicyInputContract,
    private readonly receipts:StepAttemptReceiptContract,
    private readonly outcomes:ExecutionOutcomeContract<import("../contracts/persistence/JsonValue").JsonValue>){}
  async validate(raw:unknown):Promise<ValidationResult<WorkflowRunSnapshot>>{
    const checked=await this.json.validate(raw);if(!checked.valid)return checked;if(new TextEncoder().encode(JSON.stringify(checked.value)).byteLength>2097152)return this.invalid();const row=checked.value as unknown as Record<string,unknown>;
    if(!this.object(row)||
        !this.keys(row,["schemaVersion","revision","dependencyRevision","runId","scope","definition","request","completionPolicy","budgetScopeId","deadlineEpochMs","lifecycle","engineOwner","steps","attempts","accepted","transitions","transitionPlan","completionDecision","outcome"])||
        row.schemaVersion!==1||
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

### `workflows/WorkflowRunStatements.ts`

Groups parameterized dialect SQL for the single authoritative run aggregate, avoiding database-provider conditionals inside domain/runtime classes.

```typescript
export type WorkflowRunStatements=Readonly<{schema:string;insert:string;lock:string;read:string;update:string}>;
```

### `workflows/sqliteWorkflowRunStatements.ts`

Uses sqlite parameters and a transaction-held row update lock. Schema initialization uses the existing cross-worker migration transaction contract.

```typescript
import type { WorkflowRunStatements } from "./WorkflowRunStatements";
export const sqliteWorkflowRunStatements:WorkflowRunStatements=Object.freeze({
 schema:"CREATE TABLE IF NOT EXISTS kushibot_workflow_runs_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, run_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(scope_id, project_id, run_id))",
 insert:"INSERT INTO kushibot_workflow_runs_v1(scope_id, project_id, run_id, payload) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
 lock:"UPDATE kushibot_workflow_runs_v1 SET payload = payload WHERE scope_id = ? AND project_id = ? AND run_id = ?",
 read:"SELECT payload FROM kushibot_workflow_runs_v1 WHERE scope_id = ? AND project_id = ? AND run_id = ?",
 update:"UPDATE kushibot_workflow_runs_v1 SET payload = ? WHERE scope_id = ? AND project_id = ? AND run_id = ?"
});
```

### `workflows/postgresqlWorkflowRunStatements.ts`

Uses postgresql parameters and a transaction-held row update lock. Schema initialization uses the existing cross-worker migration transaction contract.

```typescript
import type { WorkflowRunStatements } from "./WorkflowRunStatements";
export const postgresqlWorkflowRunStatements:WorkflowRunStatements=Object.freeze({
 schema:"CREATE TABLE IF NOT EXISTS kushibot_workflow_runs_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, run_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(scope_id, project_id, run_id))",
 insert:"INSERT INTO kushibot_workflow_runs_v1(scope_id, project_id, run_id, payload) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
 lock:"UPDATE kushibot_workflow_runs_v1 SET payload = payload WHERE scope_id = $1 AND project_id = $2 AND run_id = $3",
 read:"SELECT payload FROM kushibot_workflow_runs_v1 WHERE scope_id = $1 AND project_id = $2 AND run_id = $3",
 update:"UPDATE kushibot_workflow_runs_v1 SET payload = $1 WHERE scope_id = $2 AND project_id = $3 AND run_id = $4"
});
```

### `workflows/SqlWorkflowRunStore.ts`

Commits run/step lifecycles, attempt outcomes, acceptance receipts and current accepted results in one row transaction. It never nests public repository.save calls or invokes asynchronous executors under the lock.

```typescript
import type { IWorkflowRunStore } from "./IWorkflowRunStore";
import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot";
import type { WorkflowRunStatements } from "./WorkflowRunStatements";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase";
import type { ISqlExecutor } from "../persistence/sql/ISqlExecutor";
import type { IRecordCodec } from "../contracts/persistence/IRecordCodec";
import { WorkflowRun } from "./WorkflowRun";
import { canonicalWorkflowValue } from "./canonicalWorkflowValue";
import { WorkflowRunError } from "../errors/WorkflowRunError";
export class SqlWorkflowRunStore implements IWorkflowRunStore{
  private readonly key:readonly string[];private binding:string|null=null;
  constructor(private readonly database:ISqlDatabase,
    private readonly sql:WorkflowRunStatements,
    private readonly codec:IRecordCodec<WorkflowRunSnapshot>,scopeId:string,projectId:string,runId:string){if(![scopeId,projectId,runId].every(id=>/^[A-Za-z0-9_.:-]{1,128}$/.test(id)))throw new WorkflowRunError();this.key=Object.freeze([scopeId,projectId,runId]);}
  async initialize(initial:WorkflowRunSnapshot):Promise<void>{if(initial.attempts.length!==0||
        initial.steps.length!==0||
        initial.engineOwner!==null||
        initial.outcome!==null||
        initial.lifecycle.status!=="created")throw new WorkflowRunError();const payload=await this.codec.encode(initial),binding=this.bind(initial);await this.database.migrationTransaction(async tx=>{await tx.query(this.sql.schema,[]);await tx.query(this.sql.insert,[...this.key,payload]);if(this.bind(await this.load(tx))!==binding)throw new WorkflowRunError();});this.binding=binding;}
  async read():Promise<WorkflowRunSnapshot>{if(this.binding===null)throw new WorkflowRunError();const snapshot=await this.load(this.database);if(this.bind(snapshot)!==this.binding)throw new WorkflowRunError();return snapshot;}
  mutate<T>(change:(run:WorkflowRun)=>T):Promise<T>{if(this.binding===null)throw new WorkflowRunError();return this.database.transaction(async tx=>{if((await tx.query(this.sql.lock,this.key)).affectedRows!==1)throw new WorkflowRunError();const snapshot=await this.load(tx);if(this.bind(snapshot)!==this.binding)throw new WorkflowRunError();const run=await WorkflowRun.restore(snapshot),result=change(run);if(result!==null&&(typeof result==="object"||
        typeof result==="function")&&"then" in result)throw new WorkflowRunError();const payload=await this.codec.encode(run.snapshot());if((await tx.query(this.sql.update,[payload,...this.key])).affectedRows!==1)throw new WorkflowRunError();return result;});}
  private async load(tx:ISqlExecutor):Promise<WorkflowRunSnapshot>{const rows=(await tx.query(this.sql.read,this.key)).rows;if(rows.length!==1||
        typeof rows[0].payload!=="string")throw new WorkflowRunError();const snapshot=await this.codec.decode(rows[0].payload);if(snapshot.scope.scopeId!==this.key[0]||
        snapshot.scope.projectId!==this.key[1]||
        snapshot.runId!==this.key[2])throw new WorkflowRunError();return snapshot;}
  private bind(snapshot:WorkflowRunSnapshot):string{return canonicalWorkflowValue({schemaVersion:snapshot.schemaVersion,runId:snapshot.runId,scope:snapshot.scope,definition:snapshot.definition,request:snapshot.request,completionPolicy:snapshot.completionPolicy,budgetScopeId:snapshot.budgetScopeId,deadlineEpochMs:snapshot.deadlineEpochMs});}
}
```

### `workflows/WorkflowStepAttemptJournal.ts`

Implements page 22’s durable journal against the same run aggregate. A single owner-bound store mutation commits the receipt, step lifecycle and accepted-result visibility together.

```typescript
import type { IStepAttemptJournal } from "./IStepAttemptJournal";
import type { IWorkflowRunStore } from "./IWorkflowRunStore";
import type { StepAttemptClaim } from "./StepAttemptClaim";
import type { StepAttemptClaimOutcome } from "./StepAttemptClaimOutcome";
import type { StepAttemptReceipt } from "./StepAttemptReceipt";
import type { StepResultAcceptance } from "./StepResultAcceptance";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { IClock } from "../contracts/runtime/IClock";
export class WorkflowStepAttemptJournal implements IStepAttemptJournal{
 constructor(private readonly store:IWorkflowRunStore,private readonly owner:string,private readonly clock:IClock){}
 claim(command:StepAttemptClaim):Promise<StepAttemptClaimOutcome>{return this.store.mutate(run=>run.claim(this.owner,command));}
 prepare(attemptId:string,token:string,input:JsonValue):Promise<void>{return this.store.mutate(run=>run.prepare(this.owner,attemptId,token,input));}
 beginDispatch(attemptId:string,token:string):Promise<boolean>{return this.store.mutate(run=>run.dispatch(this.owner,attemptId,token));}
 recordOutcome(attemptId:string,token:string,outcome:ExecutionOutcome<JsonValue>):Promise<void>{return this.store.mutate(run=>run.record(this.owner,attemptId,token,outcome));}
 commit(attemptId:string,token:string,acceptance:StepResultAcceptance,context:IExecutionContext):Promise<StepAttemptReceipt>{return this.store.mutate(run=>run.commit(this.owner,attemptId,token,acceptance,context,this.clock.nowEpochMs()));}
}
```

### `workflows/WorkflowStepContextVerifier.ts`

Checks the authoritative aggregate binding/current dependency view, then invokes the required scoped source-evidence policy. The aggregate alone cannot prove external source truth or permissions.

```typescript
import type { IStepContextVerifier } from "./IStepContextVerifier";
import type { IWorkflowRunStore } from "./IWorkflowRunStore";
import type { IPolicy } from "../contracts/IPolicy";
import type { StepContextEvidenceInput } from "./StepContextEvidenceInput";
import type { StepInputPolicyInput } from "./StepInputPolicyInput";
import type { WorkflowDefinition } from "./WorkflowDefinition";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import { WorkflowRun } from "./WorkflowRun";
import { canonicalWorkflowValue as same } from "./canonicalWorkflowValue";
export class WorkflowStepContextVerifier implements IStepContextVerifier{
 constructor(private readonly store:IWorkflowRunStore,private readonly evidence:IPolicy<StepContextEvidenceInput,boolean>){}
 async verify(view:StepInputPolicyInput,definition:WorkflowDefinition,context:IExecutionContext):Promise<boolean>{const snapshot=await this.store.read();if(context.identity.runId!==snapshot.runId||
        same(context.scope)!==same(snapshot.scope)||
        same(definition)!==same(snapshot.definition))return false;const run=await WorkflowRun.restore(snapshot);return run.current(view)&&await this.evidence.apply(Object.freeze({run:snapshot,view,execution:context}))===true;}
}
```

### `workflows/IWorkflowStepRunnerFactory.ts`

Assembles page 22’s existing StepRunner with the invocation-owned durable journal and source verifier. It does not implement a new step execution loop.

```typescript
import type { StepRunner } from "./StepRunner";
import type { IStepAttemptJournal } from "./IStepAttemptJournal";
import type { IStepContextVerifier } from "./IStepContextVerifier";
export interface IWorkflowStepRunnerFactory{create(journal:IStepAttemptJournal,verifier:IStepContextVerifier):StepRunner;}
```

### `workflows/WorkflowStepRunnerFactory.ts`

Creates the real StepRunner with existing definition/executor/policy registries and pure validation objects. Model clients, workspaces and budgets remain owned by the registered executors.

```typescript
import type { IWorkflowStepRunnerFactory } from "./IWorkflowStepRunnerFactory";
import type { IStepAttemptJournal } from "./IStepAttemptJournal";
import type { IStepContextVerifier } from "./IStepContextVerifier";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import type { IClock } from "../contracts/runtime/IClock";
import { WorkflowDefinitionRegistry } from "./WorkflowDefinitionRegistry";
import { ExecutorRegistry } from "../executors/ExecutorRegistry";
import { StepPolicyRegistry } from "./StepPolicyRegistry";
import { StepRunner } from "./StepRunner";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract";
import { StepInputPolicyInputContract } from "./StepInputPolicyInputContract";
import { StepResultAcceptanceContract } from "./StepResultAcceptanceContract";
import { StepAttemptReceiptContract } from "./StepAttemptReceiptContract";
export class WorkflowStepRunnerFactory implements IWorkflowStepRunnerFactory{
 constructor(private readonly definitions:WorkflowDefinitionRegistry,
    private readonly executors:ExecutorRegistry,
    private readonly policies:StepPolicyRegistry,
    private readonly ids:IIdGenerator,
    private readonly clock:IClock){}
 create(journal:IStepAttemptJournal,verifier:IStepContextVerifier):StepRunner{const json=new JsonValueContract(),outcomes=new ExecutionOutcomeContract(json,json),decisions=new StepResultAcceptanceContract(json);return new StepRunner(this.definitions,this.executors,this.policies,new StepInputPolicyInputContract(json),outcomes,decisions,new StepAttemptReceiptContract(json,outcomes,decisions),verifier,journal,json,this.ids,this.clock);}
}
```

### `workflows/WorkflowPolicyRegistry.ts`

Resolves versioned deterministic transition and final-completion policies through the shared IPolicy contract. There is no workflow-specific policy interface or behavior switch by provider/executor name.

```typescript
import type { IPolicy } from "../contracts/IPolicy";
import type { RegistrationRef } from "../contracts/RegistrationRef";
import type { WorkflowTransitionInput } from "./WorkflowTransitionInput";
import type { WorkflowTransitionDecision } from "./WorkflowTransitionDecision";
import type { WorkflowCompletionInput } from "./WorkflowCompletionInput";
import type { WorkflowCompletionDecision } from "./WorkflowCompletionDecision";
import { WorkflowRunError } from "../errors/WorkflowRunError";
export class WorkflowPolicyRegistry{
 private readonly transitions=new Map<string,IPolicy<WorkflowTransitionInput,WorkflowTransitionDecision>>();private readonly completions=new Map<string,IPolicy<WorkflowCompletionInput,WorkflowCompletionDecision>>();
 registerTransition(ref:RegistrationRef,policy:IPolicy<WorkflowTransitionInput,WorkflowTransitionDecision>):void{const key=this.key(ref);if(this.transitions.has(key)||
        this.transitions.size>=64)throw new WorkflowRunError();this.transitions.set(key,Object.freeze({apply:policy.apply.bind(policy)}));}
 registerCompletion(ref:RegistrationRef,policy:IPolicy<WorkflowCompletionInput,WorkflowCompletionDecision>):void{const key=this.key(ref);if(this.completions.has(key)||
        this.completions.size>=64)throw new WorkflowRunError();this.completions.set(key,Object.freeze({apply:policy.apply.bind(policy)}));}
 transition(ref:RegistrationRef):IPolicy<WorkflowTransitionInput,WorkflowTransitionDecision>{const policy=this.transitions.get(this.key(ref));if(policy===undefined)throw new WorkflowRunError();return policy;}
 completion(ref:RegistrationRef):IPolicy<WorkflowCompletionInput,WorkflowCompletionDecision>{const policy=this.completions.get(this.key(ref));if(policy===undefined)throw new WorkflowRunError();return policy;}
 private key(ref:RegistrationRef):string{if(![ref.id,ref.version].every(id=>/^[A-Za-z0-9_.:-]{1,128}$/.test(id)))throw new WorkflowRunError();return JSON.stringify([ref.id,ref.version]);}
}
```

### `workflows/WorkflowEngine.ts`

Coordinates one sequential owner-held run using the existing StepRunner. It consumes saved receipt decisions, stages normally budgeted corrections, invalidates dependent results, and completes only after independent final acceptance.

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
  if(snapshot.outcome!==null)return this.present(snapshot);
  const owner=this.ids.nextId();if(!/^[A-Za-z0-9_.:-]{1,128}$/.test(owner)||owner===context.identity.operationId)throw new WorkflowRunError();
  if(!await this.store.mutate(run=>run.acquire(context.identity.operationId,owner)))return this.present(await this.store.read());
  const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);
  const runner=this.runners.create(new WorkflowStepAttemptJournal(this.store,owner,this.clock),new WorkflowStepContextVerifier(this.store,this.evidence));
  for(let boundary=0;boundary<snapshot.definition.maxTotalAttempts*3+8;boundary++){
   snapshot=await this.store.read();const stop=guard.check();if(stop!==null)return this.stop(owner,stop);
   if(snapshot.lifecycle.pendingOperationRefs.length>0){await this.store.mutate(run=>run.interrupt(owner));return this.present(await this.store.read());}
   const aggregate=await WorkflowRun.restore(snapshot),trigger=aggregate.unprocessed();
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

### `examples/workflows/FailedLoginVerificationTransitionPolicy.ts`

Takes the declared correction only when the independently accepted verification task completed with a shape-valid passed:false result. It selects no arbitrary executor or target and performs no edit itself.

```typescript
import type { IPolicy,WorkflowTransitionInput,WorkflowTransitionDecision } from "../../index";
import { VerificationResultContract } from "../../index";
export class FailedLoginVerificationTransitionPolicy implements IPolicy<WorkflowTransitionInput,WorkflowTransitionDecision>{
 constructor(private readonly results:VerificationResultContract){}
 async apply(input:WorkflowTransitionInput):Promise<WorkflowTransitionDecision>{if(input.trigger.acceptance.status!=="accepted"||
        input.trigger.stepId!=="verify"||
        input.trigger.outcome.status!=="completed")return {take:false};const result=await this.results.validate(input.trigger.outcome.result);return {take:result.valid&&!result.value.passed};}
}
```

### `examples/workflows/LoginWorkflowCompletionPolicy.ts`

Requires final editing/verification snapshot agreement and fresh verified passing receipts for both configured checks. This example checks the stated login verification criteria; an application must additionally encode all other original goal/security requirements in its acceptance configuration.

```typescript
import type { IPolicy,WorkflowCompletionInput,WorkflowCompletionDecision,IVerificationReceiptVerifier } from "../../index";
import { EditingResultContract,VerificationResultContract } from "../../index";
export class LoginWorkflowCompletionPolicy implements IPolicy<WorkflowCompletionInput,WorkflowCompletionDecision>{
 constructor(private readonly edits:EditingResultContract,private readonly checks:VerificationResultContract,private readonly evidence:IVerificationReceiptVerifier){}
 async apply(input:WorkflowCompletionInput):Promise<WorkflowCompletionDecision>{
  const edit=input.run.accepted.find(item=>item.stepId==="edit"),verify=input.run.accepted.find(item=>item.stepId==="verify");
  if(edit===undefined||verify===undefined)return {accepted:false,code:"LOGIN_RESULTS_MISSING",message:"Accepted editing and verification results are required."};
  const changes=await this.edits.validate(edit.result),checks=await this.checks.validate(verify.result);
  if(!changes.valid||
        !checks.valid||
        !checks.value.passed||
        changes.value.resultSnapshotRef!==checks.value.snapshotRef||
        !["typecheck","expiry-test"].every(id=>checks.value.checks.some(check=>check.checkId===id)))return {accepted:false,code:"LOGIN_CHECKS_INCOMPLETE",message:"Current login change requires passing typecheck and expiry checks on its exact snapshot."};
  for(const receipt of checks.value.checks)if(!await this.evidence.verify(receipt,input.execution))return {accepted:false,code:"LOGIN_EVIDENCE_STALE",message:"Saved check evidence could not be verified."};
  return {accepted:true};
 }
}
```

### `examples/workflows/createLoginCorrectionDefinition.ts`

Creates a new definition version with the explicit verify→edit correction edge. Ordinary investigation/specification/edit/verification dependencies remain a DAG; editing and verification are invalidated when the correction is committed.

```typescript
import type { WorkflowDefinition } from "../../index";
export function createLoginCorrectionDefinition(base:WorkflowDefinition):WorkflowDefinition{return {...base,version:"2",transitions:[{id:"fix-login",fromStepId:"verify",toStepId:"edit",policy:{id:"failed-login-checks",version:"1"},maxTraversals:2}]};}
```

### `examples/workflows/createWorkflowRunStoreExample.ts`

Shows exact public-API SQL aggregate assembly with a 2-MiB record cap, all nested validators and supplied dialect/database. The host passes a trusted empty WorkflowRun.create snapshot and initializes the original usage ledger separately without resetting it.

```typescript
import type { ISqlDatabase,WorkflowRunSnapshot,WorkflowRunStatements } from "../../index";
import { JsonValueContract,JsonRecordCodec,WorkflowDefinitionContract,StepInputPolicyInputContract,ExecutionOutcomeContract,StepResultAcceptanceContract,StepAttemptReceiptContract,WorkflowRunSnapshotContract,SqlWorkflowRunStore } from "../../index";
export async function createWorkflowRunStoreExample(database:ISqlDatabase,initial:WorkflowRunSnapshot,statements:WorkflowRunStatements):Promise<SqlWorkflowRunStore>{const json=new JsonValueContract(),outcomes=new ExecutionOutcomeContract(json,json),decisions=new StepResultAcceptanceContract(json),receipts=new StepAttemptReceiptContract(json,outcomes,decisions),contract=new WorkflowRunSnapshotContract(json,new WorkflowDefinitionContract(json),new StepInputPolicyInputContract(json),receipts,outcomes);const codec=new JsonRecordCodec(contract,json,2097152),store=new SqlWorkflowRunStore(database,statements,codec,initial.scope.scopeId,initial.scope.projectId,initial.runId);await store.initialize(initial);return store;}
```

### `examples/workflows/createLoginWorkflowEngineExample.ts`

Shows complete public-API engine assembly for the example policy versions. The host supplies the bound SQL run store, actual registered executors, original usage ledger and required source/check evidence capabilities; this helper supplies no permissive evidence fallback.

```typescript
import type { IWorkflowRunStore,IPolicy,StepContextEvidenceInput,IUsageLedgerStore,IVerificationReceiptVerifier,IIdGenerator,IClock } from "../../index";
import { WorkflowDefinitionRegistry,ExecutorRegistry,StepPolicyRegistry,WorkflowPolicyRegistry,WorkflowStepRunnerFactory,WorkflowEngine,JsonValueContract,EditingResultContract,VerificationCheckResultContract,VerificationResultContract } from "../../index";
import { FailedLoginVerificationTransitionPolicy } from "./FailedLoginVerificationTransitionPolicy";
import { LoginWorkflowCompletionPolicy } from "./LoginWorkflowCompletionPolicy";
export function createLoginWorkflowEngineExample(store:IWorkflowRunStore,definitions:WorkflowDefinitionRegistry,executors:ExecutorRegistry,stepPolicies:StepPolicyRegistry,ledger:IUsageLedgerStore,sourceEvidence:IPolicy<StepContextEvidenceInput,boolean>,checkEvidence:IVerificationReceiptVerifier,ids:IIdGenerator,clock:IClock):WorkflowEngine{
 const json=new JsonValueContract(),checks=new VerificationResultContract(json,new VerificationCheckResultContract(json));
 const policies=new WorkflowPolicyRegistry();
 policies.registerTransition({id:"failed-login-checks",version:"1"},new FailedLoginVerificationTransitionPolicy(checks));
 policies.registerCompletion({id:"login-completion",version:"1"},new LoginWorkflowCompletionPolicy(new EditingResultContract(json),checks,checkEvidence));
 const runners=new WorkflowStepRunnerFactory(definitions,executors,stepPolicies,ids,clock);
 return new WorkflowEngine(store,runners,policies,sourceEvidence,ledger,ids,clock,json);
}
```

### `index.ts`

Append the supported engine, run/step aggregate, SQL store, policy and assembly contracts. Comparison/partial helpers and application examples remain private.

```typescript
export { WorkflowRunError } from "./errors/WorkflowRunError";
export type { WorkflowResult } from "./workflows/WorkflowResult";
export type { StepRunSnapshot } from "./workflows/StepRunSnapshot";
export type { WorkflowStepAttempt } from "./workflows/WorkflowStepAttempt";
export type { WorkflowTransitionRecord } from "./workflows/WorkflowTransitionRecord";
export type { WorkflowTransitionPlan } from "./workflows/WorkflowTransitionPlan";
export type { WorkflowRunSnapshot } from "./workflows/WorkflowRunSnapshot";
export type { WorkflowEngineOutcome } from "./workflows/WorkflowEngineOutcome";
export type { WorkflowTransitionInput } from "./workflows/WorkflowTransitionInput";
export type { WorkflowTransitionDecision } from "./workflows/WorkflowTransitionDecision";
export type { WorkflowCompletionInput } from "./workflows/WorkflowCompletionInput";
export type { WorkflowCompletionDecision } from "./workflows/WorkflowCompletionDecision";
export type { StepContextEvidenceInput } from "./workflows/StepContextEvidenceInput";
export { StepRun } from "./workflows/StepRun";
export { WorkflowRun } from "./workflows/WorkflowRun";
export type { IWorkflowRunStore } from "./workflows/IWorkflowRunStore";
export { WorkflowRunSnapshotContract } from "./workflows/WorkflowRunSnapshotContract";
export type { WorkflowRunStatements } from "./workflows/WorkflowRunStatements";
export { sqliteWorkflowRunStatements } from "./workflows/sqliteWorkflowRunStatements";
export { postgresqlWorkflowRunStatements } from "./workflows/postgresqlWorkflowRunStatements";
export { SqlWorkflowRunStore } from "./workflows/SqlWorkflowRunStore";
export { WorkflowStepAttemptJournal } from "./workflows/WorkflowStepAttemptJournal";
export { WorkflowStepContextVerifier } from "./workflows/WorkflowStepContextVerifier";
export type { IWorkflowStepRunnerFactory } from "./workflows/IWorkflowStepRunnerFactory";
export { WorkflowStepRunnerFactory } from "./workflows/WorkflowStepRunnerFactory";
export { WorkflowPolicyRegistry } from "./workflows/WorkflowPolicyRegistry";
export { WorkflowEngine } from "./workflows/WorkflowEngine";
```
