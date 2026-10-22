# 22. Workflow Definitions and StepRunner

## What We Implement Here

Create immutable workflow/step definitions with versioned executors and policies, validate the dependency graph, and implement StepRunner for one bounded admitted attempt. Prepare selected input, record it before dispatch, save the executor outcome, independently evaluate acceptance, and return a committed receipt while preserving rejected, partial or pending work. Define the required transactional journal contract for the next workflow-engine phase and provide explicit offline fixtures and Google-login examples.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `contracts/RegistrationRef.ts` | `type RegistrationRef` |
| `errors/WorkflowDefinitionError.ts` | `class WorkflowDefinitionError extends Error` |
| `errors/StepExecutionError.ts` | `class StepExecutionError extends Error` |
| `workflows/StepDefinition.ts` | `type StepDefinition` |
| `workflows/WorkflowTransitionDefinition.ts` | `type WorkflowTransitionDefinition` |
| `workflows/WorkflowDefinition.ts` | `type WorkflowDefinition` |
| `workflows/WorkflowDefinitionContract.ts` | `class WorkflowDefinitionContract implements IResultContract<WorkflowDefinition>` |
| `workflows/AcceptedStepResult.ts` | `type AcceptedStepResult` |
| `workflows/StepInputPolicyInput.ts` | `type StepInputPolicyInput` |
| `workflows/StepInputPolicyInputContract.ts` | `class StepInputPolicyInputContract implements IResultContract<StepInputPolicyInput>` |
| `workflows/StepResultAcceptance.ts` | `type StepResultAcceptance` |
| `workflows/StepAcceptanceDecision.ts` | `type StepAcceptanceDecision` |
| `workflows/StepAcceptanceInput.ts` | `type StepAcceptanceInput` |
| `workflows/StepPolicyRegistry.ts` | `class StepPolicyRegistry` |
| `workflows/WorkflowDefinitionRegistry.ts` | `class WorkflowDefinitionRegistry` |
| `workflows/IStepContextVerifier.ts` | `interface IStepContextVerifier` |
| `workflows/StepRunRequest.ts` | `type StepRunRequest` |
| `workflows/StepAttemptClaim.ts` | `type StepAttemptClaim` |
| `workflows/StepAttemptReceipt.ts` | `type StepAttemptReceipt` |
| `workflows/StepRunOutcome.ts` | `type StepRunOutcome` |
| `workflows/StepAttemptClaimOutcome.ts` | `type StepAttemptClaimOutcome` |
| `workflows/IStepAttemptJournal.ts` | `interface IStepAttemptJournal` |
| `workflows/StepResultAcceptanceContract.ts` | `class StepResultAcceptanceContract implements IResultContract<StepResultAcceptance>` |
| `workflows/StepAttemptReceiptContract.ts` | `class StepAttemptReceiptContract implements IResultContract<StepAttemptReceipt>` |
| `workflows/StepRunner.ts` | `class StepRunner` |
| `examples/workflows/LoginInvestigationInputPolicy.ts` | `class LoginInvestigationInputPolicy implements IPolicy<StepInputPolicyInput, JsonValue>` |
| `examples/workflows/LoginDependencyInputPolicy.ts` | `class LoginDependencyInputPolicy implements IPolicy<StepInputPolicyInput, JsonValue>` |
| `examples/workflows/LoginVerificationInputPolicy.ts` | `class LoginVerificationInputPolicy implements IPolicy<StepInputPolicyInput, JsonValue>` |
| `examples/workflows/LoginAcceptancePolicies.ts` | `type LoginAcceptancePolicies` |
| `examples/workflows/createLoginWorkflowDefinition.ts` | `function createLoginWorkflowDefinition` |
| `examples/workflows/createLoginWorkflowExample.ts` | `function createLoginWorkflowExample` |
| `tests/workflows/MemoryStepAttemptEntry.ts` | `type MemoryStepAttemptEntry` |
| `tests/workflows/MemoryStepAttemptJournal.ts` | `class MemoryStepAttemptJournal implements IStepAttemptJournal` |
| `examples/workflows/createStepRunnerExample.ts` | `function createStepRunnerExample` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [page 01](01-scope-and-implementation-roadmap.md) and [page 02](02-package-structure-and-oop-conventions.md) for general OOP/naming/writing rules. Every class/interface has its own matching file; interfaces begin with `I`. Reuse shared `IPolicy`, `IExecutor`, `IExecutionContext`, `ExecutionOutcome`, validation, executor registry, budgets and persistence contracts rather than inventing parallel APIs. These snippets are future source specifications, not installed runtime code.
- This phase owns immutable workflow/step definitions and one-attempt StepRunner orchestration. WorkflowEngine, WorkflowRun/StepRun aggregates, ready-step selection, transition policies, bounded correction scheduling, dependency invalidation and coordinated run persistence belong to page 23. StepRunner never loops over the whole plan, chooses a next step, automatically fixes failures, publishes changes or marks a workflow completed.
- Definitions contain only finite JSON and versioned registration references. Policies, executors, closures, SDK clients, database handles and live runtime context stay in constructor-injected registries. The definition contract allows 1–64 steps, at most 16 dependencies per step, 1–8 attempts per step, 1–128 total attempts and at most 32 transitions with 1–8 traversals each. Total attempts must allow at least one attempt per declared step. Required JSON byte/node/depth limits may be reached before those numeric caps.
- Ordinary dependencies form a DAG with unique known step IDs and no self/cyclic dependencies. Bounded correction transitions are separate declarations and may revisit a step; they do not excuse a cycle in the dependency DAG. Page 23 must resolve transition policy versions, enforce total/step/traversal caps, invalidate dependent accepted outputs and define readiness before enabling such transitions. This page validates transition shape/endpoints only. Its four-step example intentionally declares no transitions.
- Executor metadata pins ID/version and input/result contract IDs/versions from page 21. The definition registry compares every field with the registered executor and resolves exact step policy versions before registration. Duplicate workflow ID/version replacement is rejected, including concurrent async registration. Production startup/recovery must bind the saved run to the exact canonical definition content or a verified digest, not only a reused ID/version string. Silent definition/policy/executor substitution is forbidden.
- `StepInputPolicyInput` is data: original request plus exactly the declared direct accepted dependencies and an immutable authorized viewRef. `IExecutionContext` is live scoped execution identity/control/reporting. They are separate. The view caps at 256 KiB and each selected dependency result at 64 KiB; large reports are scoped artifacts. Do not silently remove required dependencies to fit. Input projection returns at most 64 KiB finite JSON and uses the executor's own typed input contract before actual work.
- A view's accepted dependency contains the exact saved attempt ID and receipt reference, not an optimistic raw executor response. `IStepContextVerifier` must authenticate the run/project/workspace, original request, view content/version, definition/contract pins, active accepted dependency attempts, source constraints and receipt integrity. A forged reference or a structurally valid object proves nothing. Reverify after input preparation and around acceptance; the final journal transaction independently checks current dependency/run state to close asynchronous races.
- Input policies use `IPolicy<StepInputPolicyInput,JsonValue>`; acceptance policies use `IPolicy<StepAcceptanceInput,StepAcceptanceDecision>`. These are uses of the same existing interface, not new policy interfaces. Projections are deterministic and perform no model/tool/effect work. Acceptance may read authorized evidence through injected bounded deterministic capabilities, but this phase performs no paid inference in policy hooks. A future model-assisted acceptance wrapper must explicitly integrate normal budget reservations, unique child identities, controls and uncertain outcomes; an arbitrary free LLM call in apply is not supported.
- `StepAcceptanceInput.execution` is a live capability available only during semantic acceptance. It must not be serialized into the view/result or exposed as model-editable input. Original goals/criteria, required guards, pending effects and inherited scope cannot be weakened by a projection or acceptance policy. The executor/session already performs task-level result acceptance; StepRunner separately decides whether that validated candidate is usable for this workflow step.
- One step execution/fix has an engine-owned `stepRunId`; StepRunner requires it and runId on the incoming context and rejects a session identity on that boundary. New attempts get fresh attemptId/operationId/ownerToken under the existing step-run identity. A later correction may get a new stepRunId through the engine, while logical step/run attempt caps still span those executions. The incoming context.operationId is the stable admission command ID; redelivery reuses that command and step-run ID. It never reuses a completed model/tool call ID for new work.
- `IStepAttemptJournal` is a required production integration contract, implemented with the owning workflow persistence aggregate in page 23. It must bind the trusted run/definition/configuration/scope; atomically enforce command identity, readiness/current accepted dependencies, step-run identity, step/run attempt caps, pending effects and scheduling policy; already-accepted steps require an explicit engine-authorized correction/re-execution with the necessary invalidation, never an arbitrary fresh command; and return admitted only once. Never trust caller-supplied caps or matching strings as proof of authority. A duplicate command passing scoped current-view/control checks returns its saved receipt or pending state. A stale or cancelled current invocation may be blocked before that lookup; authorized historical receipt retrieval is a separate storage capability and does not make old work a current accepted dependency. Conflicting view/definition/step content under one command fails.
- The production journal must snapshot/freeze its command/prepared input, persist owner tokens and operation identity, and CAS every state transition. `prepare` records exact selected input before effects. `beginDispatch` atomically changes prepared to dispatching once; an existing dispatching operation is pending, never permission to invoke again. `recordOutcome` saves the exact validated raw outcome before semantic acceptance. A crash after model/tool work or after candidate storage cannot justify rerunning the executor. Recovery may finish acceptance/reconciliation separately using that saved work; page 24 owns restoration policy.
- `commit` must atomically record the bounded acceptance receipt and expose an accepted dependency result under the same run/step revision checks. Recheck persisted cancellation, deadline/controls and active dependency receipts at the acceptance linearization point. If they changed, preserve the candidate and downgrade to not-evaluated, or fail the transaction without exposing acceptance. It may never upgrade rejected/not-evaluated work to accepted. Return only after commit succeeds. Downstream work must not observe a candidate between an independent result save and a later acceptance save.
- Reuse page-06 storage/codecs/CAS patterns and page-08 required lifecycle commit semantics when implementing the journal. The existing public ExecutionRecordRepository.save owns its transaction and has no saveWithin method; calling it separately from another store is not atomic run/step acceptance. Provide an internal transactional aggregate adapter using the same supplied transaction, records/receipts and optional outbox in the owning engine phase. This page supplies no fake SQL adapter and does not claim atomicity from independent saves.
- The in-memory journal is an explicitly private offline fixture. It exercises per-run sequential admission, owner tokens, caps, ready dependency receipts, write-ahead stages, candidate retention and accepted-result exposure. It has no disk durability, cross-process locks, source authorization, CAS-backed workflow aggregates, outbox or complete engine lifecycle implementation. Its seeded accepted records are test setup, not a production import/acceptance API. Production scheduling and recovery guarantees require the real adapter and integration tests.
- Attempt admission consumes a durable logical attempt count even if projection/control fails before invocation. Counts cannot be reset by changing model, session, step-run ID, restarting or clearing a failed result. Those counts are separate from page-09 model/tool/iteration/fix usage: every executor still shares the original run ledger, and configured correction/fix accounting belongs to the engine. StepRunner adds no free model/tool work, hidden retry, closing inference, answer cache or new ledger. Provider prompt caching stays within the ordinary composer/provider adapters.
- Invalid projected JSON produces a recorded failed attempt before executor invocation. Cancellation or stale context after preparation produces recorded stopped work with the prepared input retained. A thrown policy/validator/verifier/executor/persistence exception propagates; the journal's last durable stage remains authoritative. It must not be turned into success or a safe-to-retry no-effects failure. Required candidate/receipt persistence failures are observable and prevent accepted dependency exposure. Optional tracing being disabled changes none of these obligations.
- Executor completion, acceptance and workflow completion are different. A completed candidate may be accepted, rejected for semantic reasons, or not evaluated because control/source state changed. Stopped/failed executor outcomes always retain not-evaluated acceptance and their exact partial/pending payload. A rejection retains the original candidate instead of replacing it with an invented executor failure. Only receipt.acceptance.status=accepted with a completed outcome can become AcceptedStepResult; recorded alone does not mean successful.
- Verification completed/passed:false can be a valid accepted checking result when the step criterion is “run the checks and record trustworthy evidence”. The engine then chooses an allowed correction transition from that evidence. A step whose criterion requires all checks to pass may instead reject it. Encode the intended semantics explicitly in its acceptance policy; do not silently equate completed with passed, or treat a stopped verification result as completed checking.
- Controls are checked before admission, before executor dispatch and around acceptance; the journal rechecks at commit. Known executor output is saved before cancellation/freshness prevents its acceptance. A caller timing out does not undo underlying model/tool effects. A stopped/failed outcome with pending refs blocks incompatible follow-up work until reconciled. A pre-admission blocked result creates no attempt; earlier accepted work remains in the workflow's own records. The engine reports controls/limits with its accumulated run partial, rather than fabricating completed steps.
- Public examples show investigation → specification → edit → verification. The dependency projection carries authorized receipt references and the verification projection selects the accepted editing result's actual snapshot. Host source providers must resolve/authorize such receipt references before using their content. The example requires independent application acceptance policies and real page-21 executor registrations; it does not include an always-accept substitute, a working process runner or live provider calls. The runner-construction example shows its exact injected validators/verifier/journal setup. Application code consumes the root public API; internal files import owning modules directly.
- Required audit data includes workflow/step/attempt IDs, exact definition/registration versions, owner/command identity, source/view refs, selected input, raw outcome, acceptance receipt and pending operations. These are scoped required records, not optional logs. Optional diagnostics include only safe IDs/status/counters; do not print prepared inputs, prompts, source text, request bodies, secrets or private reasoning. Large authoritative evidence stays in scoped artifacts with integrity/provenance checked before acceptance.
- Verification covers graph cycles/unknown dependencies, exact contract versions, missing policy registration, immutable views, undeclared/unaccepted dependencies, forged/stale sources, command replay/conflict, per-step/run caps, fresh identities, prepared-input persistence, one-time dispatch, saved candidate before acceptance, semantic rejection, acceptance exceptions, cancellation at commit, raw partial/pending retention and no executor reinvocation after a crash-like failure. Offline fixtures require no paid model calls. Real transactional aggregate/dependency invalidation/recovery suites are required in the next owning phases before durability or complete workflow execution is claimed.

## TypeScript Code for Each File

### `contracts/RegistrationRef.ts`

Pins a trusted registration by ID and exact implementation version; executable policy or executor objects never enter serialized workflow definitions.

```typescript
export type RegistrationRef = Readonly<{ id: string; version: string }>;
```

### `errors/WorkflowDefinitionError.ts`

Reports an invalid or unresolved workflow definition without including user request or source content.

```typescript
export class WorkflowDefinitionError extends Error { readonly code = "WORKFLOW_DEFINITION_INVALID"; constructor() { super("Workflow definition or its registrations are invalid."); this.name = "WorkflowDefinitionError"; } }
```

### `errors/StepExecutionError.ts`

Reports invalid trusted step bindings, prepared data or journal receipts. Post-dispatch errors remain visible to recovery instead of authorizing an executor retry.

```typescript
export class StepExecutionError extends Error { readonly code = "STEP_EXECUTION_INVALID"; constructor() { super("Step execution binding, policy output, or journal receipt is invalid."); this.name = "StepExecutionError"; } }
```

### `workflows/StepDefinition.ts`

Defines one reusable assignment: exact executor/contracts, accepted dependencies, input/acceptance policy registrations and a bounded number of attempts. It contains no live run state.

```typescript
import type { ExecutorMetadata } from "../executors/ExecutorMetadata";
import type { RegistrationRef } from "../contracts/RegistrationRef";
export type StepDefinition = Readonly<{ id: string; dependencies: readonly string[]; executor: ExecutorMetadata; inputPolicy: RegistrationRef; acceptancePolicy: RegistrationRef; maxAttempts: number }>;
```

### `workflows/WorkflowTransitionDefinition.ts`

Declares an explicitly bounded candidate transition for the future engine. Transition policies and traversal/invalidation semantics are implemented in page 23, not inside StepRunner.

```typescript
import type { RegistrationRef } from "../contracts/RegistrationRef";
export type WorkflowTransitionDefinition = Readonly<{ id: string; fromStepId: string; toStepId: string; policy: RegistrationRef; maxTraversals: number }>;
```

### `workflows/WorkflowDefinition.ts`

Separates the reusable dependency DAG and bounded transition declarations from run/attempt records. Ordinary dependencies must be acyclic; correction transitions are a separate explicitly bounded graph.

```typescript
import type { StepDefinition } from "./StepDefinition";
import type { WorkflowTransitionDefinition } from "./WorkflowTransitionDefinition";
export type WorkflowDefinition = Readonly<{ id: string; version: string; steps: readonly StepDefinition[]; transitions: readonly WorkflowTransitionDefinition[]; maxTotalAttempts: number }>;
```

### `workflows/WorkflowDefinitionContract.ts`

Copies finite JSON, checks exact fields and registrations, verifies a dependency DAG, and bounds steps, attempts and transition declarations. Runtime registration availability is checked separately by the definition registry.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { WorkflowDefinition } from "./WorkflowDefinition";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class WorkflowDefinitionContract implements IResultContract<WorkflowDefinition> {
  readonly id = "workflow-definition"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<WorkflowDefinition>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 131072) return this.invalid();
    const row = checked.value as unknown as Record<string,unknown>;
    if (!this.object(row) ||
         !this.keys(row,["id","version","steps","transitions","maxTotalAttempts"]) ||
         !this.validId(row.id) ||
         !this.validId(row.version) ||
         !Array.isArray(row.steps) ||
         row.steps.length < 1 ||
         row.steps.length > 64 ||
         !Array.isArray(row.transitions) ||
         row.transitions.length > 32 ||
         !Number.isSafeInteger(row.maxTotalAttempts) ||
         (row.maxTotalAttempts as number) < row.steps.length ||
         (row.maxTotalAttempts as number) > 128) return this.invalid();
    for (const step of row.steps) if (!this.object(step) ||
         !this.keys(step,["id","dependencies","executor","inputPolicy","acceptancePolicy","maxAttempts"]) ||
         !this.validId(step.id) ||
         !Array.isArray(step.dependencies) ||
         step.dependencies.length > 16 ||
         !step.dependencies.every(id => this.validId(id)) ||
         new Set(step.dependencies).size !== step.dependencies.length ||
         !this.metadata(step.executor) ||
         !this.reference(step.inputPolicy) ||
         !this.reference(step.acceptancePolicy) ||
         !Number.isSafeInteger(step.maxAttempts) ||
         (step.maxAttempts as number) < 1 ||
         (step.maxAttempts as number) > 8) return this.invalid();
    const definition = checked.value as unknown as WorkflowDefinition;
    const ids = new Set(definition.steps.map(step => step.id));
    if (ids.size !== definition.steps.length || definition.steps.some(step => step.dependencies.some(id => !ids.has(id) || id === step.id))) return this.invalid();
    const visited = new Set<string>();
    while (visited.size < ids.size) { const ready = definition.steps.filter(step => !visited.has(step.id) && step.dependencies.every(id => visited.has(id))); if (ready.length === 0) return this.invalid(); for (const step of ready) visited.add(step.id); }
    const transitionIds = new Set<string>();
    for (const transition of row.transitions) {
      if (!this.object(transition) ||
         !this.keys(transition,["id","fromStepId","toStepId","policy","maxTraversals"]) ||
         !this.validId(transition.id) ||
         transitionIds.has(transition.id as string) ||
         !ids.has(transition.fromStepId as string) ||
         !ids.has(transition.toStepId as string) ||
         !this.reference(transition.policy) ||
         !Number.isSafeInteger(transition.maxTraversals) ||
         (transition.maxTraversals as number) < 1 ||
         (transition.maxTraversals as number) > 8) return this.invalid();
      transitionIds.add(transition.id as string);
    }
    return { valid: true, value: definition };
  }
  private object(value: unknown): value is Record<string,unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string,unknown>,keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private validId(value: unknown): boolean { return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,128}$/.test(value); }
  private reference(value: unknown): boolean { return this.object(value) && this.keys(value,["id","version"]) && this.validId(value.id) && this.validId(value.version); }
  private metadata(value: unknown): boolean { const keys = ["id","version","inputContractId","inputContractVersion","resultContractId","resultContractVersion"]; return this.object(value) && this.keys(value,keys) && keys.every(key => this.validId(value[key])); }
  private invalid(): ValidationResult<never> { return { valid:false,issues:[{path:[],code:"INVALID_WORKFLOW_DEFINITION",message:"Workflow definition is malformed or violates graph/limit rules."}] }; }
}
```

### `workflows/AcceptedStepResult.ts`

Identifies a durably accepted dependency attempt and its bounded selected result. A plain completed executor response or an unaccepted candidate cannot be inserted as accepted work.

```typescript
import type { JsonValue } from "../contracts/persistence/JsonValue";
export type AcceptedStepResult = Readonly<{ stepId: string; attemptId: string; receiptRef: string; result: JsonValue }>;
```

### `workflows/StepInputPolicyInput.ts`

Contains an immutable authorized view of the original request and exactly this step’s direct accepted dependencies. It is data, separate from live IExecutionContext services.

```typescript
import type { RegistrationRef } from "../contracts/RegistrationRef";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { AcceptedStepResult } from "./AcceptedStepResult";
export type StepInputPolicyInput = Readonly<{ workflow: RegistrationRef; stepId: string; viewRef: string; request: JsonValue; dependencies: readonly AcceptedStepResult[] }>;
```

### `workflows/StepInputPolicyInputContract.ts`

Validates the bounded workflow data view and reference shapes. The required runtime verifier checks that those references really identify authorized current accepted records.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { StepInputPolicyInput } from "./StepInputPolicyInput";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class StepInputPolicyInputContract implements IResultContract<StepInputPolicyInput> {
  readonly id = "step-input-policy-view"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<StepInputPolicyInput>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 262144) return this.invalid();
    const row = checked.value as unknown as Record<string,unknown>;
    if (!this.object(row) ||
         !this.keys(row,["workflow","stepId","viewRef","request","dependencies"]) ||
         !this.object(row.workflow) ||
         !this.keys(row.workflow,["id","version"]) ||
         !this.validId(row.workflow.id) ||
         !this.validId(row.workflow.version) ||
         !this.validId(row.stepId) ||
         !this.ref(row.viewRef) ||
         !Array.isArray(row.dependencies) ||
         row.dependencies.length > 16) return this.invalid();
    const ids = new Set<string>();
    for (const dependency of row.dependencies) { if (!this.object(dependency) ||
         !this.keys(dependency,["stepId","attemptId","receiptRef","result"]) ||
         !this.validId(dependency.stepId) ||
         ids.has(dependency.stepId as string) ||
         !this.validId(dependency.attemptId) ||
         !this.ref(dependency.receiptRef) ||
         new TextEncoder().encode(JSON.stringify(dependency.result)).byteLength > 65536) return this.invalid(); ids.add(dependency.stepId as string); }
    return {valid:true,value:checked.value as unknown as StepInputPolicyInput};
  }
  private object(value: unknown): value is Record<string,unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string,unknown>,keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private validId(value: unknown): boolean { return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,128}$/.test(value); }
  private ref(value: unknown): boolean { return typeof value === "string" && value.length > 0 && value.length <= 256; }
  private invalid(): ValidationResult<never> { return {valid:false,issues:[{path:[],code:"INVALID_STEP_VIEW",message:"Step input view is invalid."}]}; }
}
```

### `workflows/StepResultAcceptance.ts`

Separates an accepted result from a rejected candidate and a candidate not evaluated because controls or source freshness prevented acceptance. None of these rewrites the original executor outcome.

```typescript
export type StepResultAcceptance = Readonly<{status:"accepted"}> | Readonly<{status:"rejected";code:string;message:string}> | Readonly<{status:"not-evaluated";code:string;message:string}>;
```

### `workflows/StepAcceptanceDecision.ts`

Uses TypeScript Exclude to restrict an acceptance policy to accept/reject. The runner/journal owns not-evaluated control and recovery decisions.

```typescript
import type { StepResultAcceptance } from "./StepResultAcceptance";
export type StepAcceptanceDecision = Exclude<StepResultAcceptance,Readonly<{status:"not-evaluated";code:string;message:string}>>;
```

### `workflows/StepAcceptanceInput.ts`

Supplies original selected context, prepared executor input and a validated candidate to deterministic semantic acceptance. The execution field is a live scoped capability and is never serialized into the result/view.

```typescript
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { StepInputPolicyInput } from "./StepInputPolicyInput";
export type StepAcceptanceInput = Readonly<{ view:StepInputPolicyInput; input:JsonValue; candidate:JsonValue; execution:IExecutionContext }>;
```

### `workflows/StepPolicyRegistry.ts`

Resolves exact versions of input and acceptance policies through separate Maps using the existing IPolicy interface. Transition policy resolution belongs to the next phase.

```typescript
import type { IPolicy } from "../contracts/IPolicy";
import type { RegistrationRef } from "../contracts/RegistrationRef";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { StepInputPolicyInput } from "./StepInputPolicyInput";
import type { StepAcceptanceInput } from "./StepAcceptanceInput";
import type { StepAcceptanceDecision } from "./StepAcceptanceDecision";
import { WorkflowDefinitionError } from "../errors/WorkflowDefinitionError";
export class StepPolicyRegistry {
  private readonly inputs = new Map<string,IPolicy<StepInputPolicyInput,JsonValue>>();
  private readonly acceptance = new Map<string,IPolicy<StepAcceptanceInput,StepAcceptanceDecision>>();
  registerInput(ref:RegistrationRef, policy:IPolicy<StepInputPolicyInput,JsonValue>):void { const key=this.key(ref); if(this.inputs.has(key)||
        this.inputs.size>=128)throw new WorkflowDefinitionError(); this.inputs.set(key,Object.freeze({apply:policy.apply.bind(policy)})); }
  registerAcceptance(ref:RegistrationRef, policy:IPolicy<StepAcceptanceInput,StepAcceptanceDecision>):void { const key=this.key(ref); if(this.acceptance.has(key)||
        this.acceptance.size>=128)throw new WorkflowDefinitionError(); this.acceptance.set(key,Object.freeze({apply:policy.apply.bind(policy)})); }
  input(ref:RegistrationRef):IPolicy<StepInputPolicyInput,JsonValue> { const policy=this.inputs.get(this.key(ref)); if(policy===undefined)throw new WorkflowDefinitionError(); return policy; }
  accept(ref:RegistrationRef):IPolicy<StepAcceptanceInput,StepAcceptanceDecision> { const policy=this.acceptance.get(this.key(ref)); if(policy===undefined)throw new WorkflowDefinitionError(); return policy; }
  private key(ref:RegistrationRef):string { if(![ref.id,ref.version].every(value=>/^[A-Za-z0-9_.:-]{1,128}$/.test(value)))throw new WorkflowDefinitionError(); return JSON.stringify([ref.id,ref.version]); }
}
```

### `workflows/WorkflowDefinitionRegistry.ts`

Registers immutable validated definitions only after exact executor metadata and step policy references resolve. It rejects replacement of a workflow ID/version in place.

```typescript
import type { WorkflowDefinition } from "./WorkflowDefinition";
import type { RegistrationRef } from "../contracts/RegistrationRef";
import { WorkflowDefinitionContract } from "./WorkflowDefinitionContract";
import { StepPolicyRegistry } from "./StepPolicyRegistry";
import { ExecutorRegistry } from "../executors/ExecutorRegistry";
import { WorkflowDefinitionError } from "../errors/WorkflowDefinitionError";
export class WorkflowDefinitionRegistry {
  private readonly definitions=new Map<string,WorkflowDefinition>();
  constructor(private readonly contract:WorkflowDefinitionContract,private readonly executors:ExecutorRegistry,private readonly policies:StepPolicyRegistry){}
  async register(raw:unknown):Promise<void>{
    const checked=await this.contract.validate(raw);if(!checked.valid)throw new WorkflowDefinitionError();
    for(const step of checked.value.steps){const actual=this.executors.resolve(step.executor.id,step.executor.version).metadata;if(Object.keys(actual).some(key=>actual[key as keyof typeof actual]!==step.executor[key as keyof typeof actual]))throw new WorkflowDefinitionError();this.policies.input(step.inputPolicy);this.policies.accept(step.acceptancePolicy);}
    const key=this.key(checked.value);if(this.definitions.has(key)||this.definitions.size>=64)throw new WorkflowDefinitionError();this.definitions.set(key,checked.value);
  }
  resolve(ref:RegistrationRef):WorkflowDefinition{const definition=this.definitions.get(this.key(ref));if(definition===undefined)throw new WorkflowDefinitionError();return definition;}
  private key(ref:RegistrationRef):string{if(![ref.id,ref.version].every(value=>/^[A-Za-z0-9_.:-]{1,128}$/.test(value)))throw new WorkflowDefinitionError();return JSON.stringify([ref.id,ref.version]);}
}
```

### `workflows/IStepContextVerifier.ts`

Authenticates the scoped request/view and current accepted dependency receipts, including exact definition/executor versions and required source constraints. A reference string or TypeScript assertion alone is insufficient.

```typescript
import type { StepInputPolicyInput } from "./StepInputPolicyInput";
import type { WorkflowDefinition } from "./WorkflowDefinition";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export interface IStepContextVerifier { verify(view:StepInputPolicyInput,definition:WorkflowDefinition,context:IExecutionContext):Promise<boolean>; }
```

### `workflows/StepRunRequest.ts`

Requests one step attempt against an authorized immutable data view. The engine selects readiness; StepRunner independently checks the declared dependency set before dispatch.

```typescript
import type { RegistrationRef } from "../contracts/RegistrationRef";
import type { StepInputPolicyInput } from "./StepInputPolicyInput";
export type StepRunRequest=Readonly<{workflow:RegistrationRef;stepId:string;view:StepInputPolicyInput}>;
```

### `workflows/StepAttemptClaim.ts`

Records the unique incoming command and fresh executor/attempt identities and the engine-owned step-run identity before preparation or effects. The journal is already bound to the trusted run definition, caps and parent state.

```typescript
import type { RegistrationRef } from "../contracts/RegistrationRef";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import type { StepDefinition } from "./StepDefinition";
import type { StepInputPolicyInput } from "./StepInputPolicyInput";
export type StepAttemptClaim=Readonly<{commandId:string;ownerToken:string;attemptId:string;operationId:string;stepRunId:string;runId:string;scope:ExecutionScopeRef;workflow:RegistrationRef;step:StepDefinition;view:StepInputPolicyInput;maxRunAttempts:number}>;
```

### `workflows/StepAttemptReceipt.ts`

Identifies a saved attempt outcome and its separate acceptance decision. Only accepted receipts may become dependency results; rejected/not-evaluated candidates remain recoverable work.

```typescript
import type { RegistrationRef } from "../contracts/RegistrationRef";
import type { ExecutorMetadata } from "../executors/ExecutorMetadata";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { StepResultAcceptance } from "./StepResultAcceptance";
export type StepAttemptReceipt=Readonly<{attemptId:string;stepRunId:string;runId:string;stepId:string;attemptNumber:number;workflow:RegistrationRef;executor:ExecutorMetadata;viewRef:string;receiptRef:string;outcome:ExecutionOutcome<JsonValue>;acceptance:StepResultAcceptance}>;
```

### `workflows/StepRunOutcome.ts`

Reports a saved receipt, an unresolved attempt or a pre-admission block. recorded is not synonymous with accepted: callers inspect the receipt acceptance and underlying executor outcome.

```typescript
import type { StepAttemptReceipt } from "./StepAttemptReceipt";
export type StepRunOutcome=Readonly<{status:"recorded";receipt:StepAttemptReceipt}>|Readonly<{status:"pending";attemptId:string;pendingOperationRefs:readonly string[]}>|Readonly<{status:"blocked";code:string}>;
```

### `workflows/StepAttemptClaimOutcome.ts`

Distinguishes new admission from an existing receipt/pending attempt and a durable readiness/count rejection. Only admitted permits preparation and potential dispatch.

```typescript
import type { StepRunOutcome } from "./StepRunOutcome";
export type StepAttemptClaimOutcome=Readonly<{status:"admitted";attemptNumber:number}>|Readonly<{status:"existing";outcome:StepRunOutcome}>|Readonly<{status:"blocked";code:string}>;
```

### `workflows/IStepAttemptJournal.ts`

Defines the required durable run/attempt boundary. The workflow persistence owner must implement atomic readiness/caps/command claims, write-ahead dispatch, saved candidates and accepted-result publication; an offline fixture is not that adapter.

```typescript
import type { StepAttemptClaim } from "./StepAttemptClaim";
import type { StepAttemptClaimOutcome } from "./StepAttemptClaimOutcome";
import type { StepResultAcceptance } from "./StepResultAcceptance";
import type { StepAttemptReceipt } from "./StepAttemptReceipt";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export interface IStepAttemptJournal{
  claim(command:StepAttemptClaim):Promise<StepAttemptClaimOutcome>;
  prepare(attemptId:string,ownerToken:string,input:JsonValue):Promise<void>;
  beginDispatch(attemptId:string,ownerToken:string):Promise<boolean>;
  recordOutcome(attemptId:string,ownerToken:string,outcome:ExecutionOutcome<JsonValue>):Promise<void>;
  commit(attemptId:string,ownerToken:string,acceptance:StepResultAcceptance,context:IExecutionContext):Promise<StepAttemptReceipt>;
}
```

### `workflows/StepResultAcceptanceContract.ts`

Strictly validates bounded safe acceptance decisions. The runner additionally excludes not-evaluated from policy-produced decisions, reserving it for control/freshness handling.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { StepResultAcceptance } from "./StepResultAcceptance";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class StepResultAcceptanceContract implements IResultContract<StepResultAcceptance>{
  readonly id="step-result-acceptance";readonly version="1";
  constructor(private readonly json:JsonValueContract){}
  async validate(raw:unknown):Promise<ValidationResult<StepResultAcceptance>>{
    const checked=await this.json.validate(raw);if(!checked.valid)return checked;const row=checked.value as unknown as Record<string,unknown>;
    if(row!==null&&typeof row==="object"&&!Array.isArray(row)){
      if(row.status==="accepted"&&Object.keys(row).length===1)return {valid:true,value:checked.value as unknown as StepResultAcceptance};
      if((row.status==="rejected"||
        row.status==="not-evaluated")&&Object.keys(row).length===3&&typeof row.code==="string"&&/^[A-Z0-9_:-]{1,128}$/.test(row.code)&&typeof row.message==="string"&&row.message.length>0&&row.message.length<=1024)return {valid:true,value:checked.value as unknown as StepResultAcceptance};
    }
    return {valid:false,issues:[{path:[],code:"INVALID_STEP_ACCEPTANCE",message:"Step acceptance decision is invalid."}]};
  }
}
```

### `workflows/StepAttemptReceiptContract.ts`

Checks restored/delivered receipt shape, exact version metadata and outcome/acceptance consistency. The owning journal and context verifier establish persistence provenance and current accepted status.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { StepAttemptReceipt } from "./StepAttemptReceipt";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract";
import { StepResultAcceptanceContract } from "./StepResultAcceptanceContract";
export class StepAttemptReceiptContract implements IResultContract<StepAttemptReceipt>{
  readonly id="step-attempt-receipt";readonly version="1";
  constructor(private readonly json:JsonValueContract,private readonly outcomes:ExecutionOutcomeContract<JsonValue>,private readonly acceptance:StepResultAcceptanceContract){}
  async validate(raw:unknown):Promise<ValidationResult<StepAttemptReceipt>>{
    const checked=await this.json.validate(raw);if(!checked.valid)return checked;if(new TextEncoder().encode(JSON.stringify(checked.value)).byteLength>131072)return this.invalid();const row=checked.value as unknown as Record<string,unknown>;
    if(!this.object(row)||
        !this.keys(row,["attemptId","stepRunId","runId","stepId","attemptNumber","workflow","executor","viewRef","receiptRef","outcome","acceptance"])||
        ![row.attemptId,row.stepRunId,row.runId,row.stepId].every(value=>this.validId(value))||
        !Number.isSafeInteger(row.attemptNumber)||
        (row.attemptNumber as number)<1||
        (row.attemptNumber as number)>8||
        !this.reference(row.workflow)||
        !this.metadata(row.executor)||
        !this.ref(row.viewRef)||
        !this.ref(row.receiptRef))return this.invalid();
    const outcome=await this.outcomes.validate(row.outcome),acceptance=await this.acceptance.validate(row.acceptance);if(!outcome.valid||
        !acceptance.valid||
        (outcome.value.status!=="completed"&&acceptance.value.status!=="not-evaluated"))return this.invalid();
    return {valid:true,value:Object.freeze({...checked.value as unknown as StepAttemptReceipt,outcome:outcome.value,acceptance:acceptance.value})};
  }
  private object(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  private keys(row:Record<string,unknown>,keys:readonly string[]):boolean{return Object.keys(row).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(row,key));}
  private validId(value:unknown):boolean{return typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(value);}
  private ref(value:unknown):boolean{return typeof value==="string"&&value.length>0&&value.length<=256;}
  private reference(value:unknown):boolean{return this.object(value)&&this.keys(value,["id","version"])&&this.validId(value.id)&&this.validId(value.version);}
  private metadata(value:unknown):boolean{const keys=["id","version","inputContractId","inputContractVersion","resultContractId","resultContractVersion"];return this.object(value)&&this.keys(value,keys)&&keys.every(key=>this.validId(value[key]));}
  private invalid():ValidationResult<never>{return {valid:false,issues:[{path:[],code:"INVALID_STEP_RECEIPT",message:"Step attempt receipt is invalid."}]};}
}
```

### `workflows/StepRunner.ts`

Runs one admitted attempt: immutable view → input policy → durable prepared input → write-ahead dispatch → validated saved outcome → semantic acceptance → committed receipt. It never schedules another step or reruns an uncertain executor.

```typescript
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
    const projected=await this.policies.input(step.inputPolicy).apply(view),input=await this.json.validate(projected);
    if(!input.valid||
        new TextEncoder().encode(JSON.stringify(input.value)).byteLength>65536){const failed:ExecutionOutcome<JsonValue>={status:"failed",error:{code:"STEP_INPUT_POLICY_INVALID",message:"Input policy did not produce bounded JSON."},partial:{summary:"",evidenceRefs:[],artifactRefs:[],unresolved:["Prepare valid executor input."]},pendingOperationRefs:[]};await this.journal.recordOutcome(claim.attemptId,claim.ownerToken,failed);return this.finish(claim,attemptNumber,failed,{status:"not-evaluated",code:"INPUT_REJECTED",message:"Executor did not start."},execution);}
    await this.journal.prepare(claim.attemptId,claim.ownerToken,input.value);
    const stop=guard.check();const verified=stop===null&&await this.verifier.verify(view,definition,execution);const afterVerify=guard.check();
    if(stop!==null||
        afterVerify!==null||
        !verified){const reason=stop??afterVerify??{code:"no-progress" as const,message:"Prepared step context is no longer current."};const stopped:ExecutionOutcome<JsonValue>={status:"stopped",reason,partial:{summary:"Prepared executor input is retained in the attempt journal.",evidenceRefs:[],artifactRefs:[],unresolved:["Executor did not start."]},pendingOperationRefs:[]};await this.journal.recordOutcome(claim.attemptId,claim.ownerToken,stopped);return this.finish(claim,attemptNumber,stopped,{status:"not-evaluated",code:"DISPATCH_BLOCKED",message:"Controls or source view prevented dispatch."},execution);}
    if(!await this.journal.beginDispatch(claim.attemptId,claim.ownerToken))return {status:"pending",attemptId:claim.attemptId,pendingOperationRefs:[claim.operationId]};
    const dispatchStop=guard.check();
    if(dispatchStop!==null){const stopped:ExecutionOutcome<JsonValue>={status:"stopped",reason:dispatchStop,partial:{summary:"Prepared input retained; executor did not start.",evidenceRefs:[],artifactRefs:[],unresolved:["Executor did not start."]},pendingOperationRefs:[]};await this.journal.recordOutcome(claim.attemptId,claim.ownerToken,stopped);return this.finish(claim,attemptNumber,stopped,{status:"not-evaluated",code:"DISPATCH_BLOCKED",message:"Controls prevented executor invocation."},execution);}
    const registered=this.executors.resolve(step.executor.id,step.executor.version);
    const outcome=await this.outcomes.validate(await registered.execute(input.value,execution));if(!outcome.valid)throw new StepExecutionError();
    await this.journal.recordOutcome(claim.attemptId,claim.ownerToken,outcome.value);
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

### `examples/workflows/LoginInvestigationInputPolicy.ts`

Projects the original validated task request into investigation input through public APIs. It does not pass the whole run or live services into the executor.

```typescript
import type { IPolicy,StepInputPolicyInput,JsonValue } from "../../index";
import { TaskInputContract,JsonValueContract,StepExecutionError } from "../../index";
export class LoginInvestigationInputPolicy implements IPolicy<StepInputPolicyInput,JsonValue>{
  constructor(private readonly tasks:TaskInputContract,private readonly json:JsonValueContract){}
  async apply(view:StepInputPolicyInput):Promise<JsonValue>{const task=await this.tasks.validate(view.request);if(!task.valid)throw new StepExecutionError();const value=await this.json.validate(task.value);if(!value.valid)throw new StepExecutionError();return value.value;}
}
```

### `examples/workflows/LoginDependencyInputPolicy.ts`

Reuses the same projection behavior for specification and editing, selecting one named accepted dependency receipt plus the original task. The host context source must know how to read authorized step-receipt references.

```typescript
import type { IPolicy,StepInputPolicyInput,JsonValue } from "../../index";
import { TaskInputContract,JsonValueContract,StepExecutionError } from "../../index";
export class LoginDependencyInputPolicy implements IPolicy<StepInputPolicyInput,JsonValue>{
  constructor(private readonly dependencyId:string,private readonly tasks:TaskInputContract,private readonly json:JsonValueContract){}
  async apply(view:StepInputPolicyInput):Promise<JsonValue>{
    const task=await this.tasks.validate(view.request),dependency=view.dependencies.find(result=>result.stepId===this.dependencyId);if(!task.valid||
        dependency===undefined)throw new StepExecutionError();
    const input=await this.tasks.validate({...task.value,sourceRefs:[...new Set([...task.value.sourceRefs,dependency.receiptRef])]});if(!input.valid)throw new StepExecutionError();const value=await this.json.validate(input.value);if(!value.valid)throw new StepExecutionError();return value.value;
  }
}
```

### `examples/workflows/LoginVerificationInputPolicy.ts`

Selects the accepted editing result’s actual result snapshot for configured checks. It cannot replace missing editing work with a made-up snapshot or test success.

```typescript
import type { IPolicy,StepInputPolicyInput,JsonValue } from "../../index";
import { EditingResultContract,VerificationInputContract,JsonValueContract,StepExecutionError } from "../../index";
export class LoginVerificationInputPolicy implements IPolicy<StepInputPolicyInput,JsonValue>{
  constructor(private readonly edits:EditingResultContract,private readonly checks:VerificationInputContract,private readonly json:JsonValueContract){}
  async apply(view:StepInputPolicyInput):Promise<JsonValue>{const dependency=view.dependencies.find(result=>result.stepId==="edit");if(dependency===undefined)throw new StepExecutionError();const edit=await this.edits.validate(dependency.result);if(!edit.valid)throw new StepExecutionError();const input=await this.checks.validate({snapshotRef:edit.value.resultSnapshotRef,checkIds:["typecheck","expiry-test"]});if(!input.valid)throw new StepExecutionError();const value=await this.json.validate(input.value);if(!value.valid)throw new StepExecutionError();return value.value;}
}
```

### `examples/workflows/LoginAcceptancePolicies.ts`

Requires application-supplied independent acceptance policies for the four steps. The example does not silently substitute an always-accept validator for evidence/criteria verification.

```typescript
import type { IPolicy,StepAcceptanceInput,StepAcceptanceDecision } from "../../index";
export type LoginAcceptancePolicies=Readonly<{investigate:IPolicy<StepAcceptanceInput,StepAcceptanceDecision>;specify:IPolicy<StepAcceptanceInput,StepAcceptanceDecision>;edit:IPolicy<StepAcceptanceInput,StepAcceptanceDecision>;verify:IPolicy<StepAcceptanceInput,StepAcceptanceDecision>}>;
```

### `examples/workflows/createLoginWorkflowDefinition.ts`

Declares the four-step dependency chain using exact executor metadata from page 21. This example has no correction transitions yet; the next page adds bounded engine scheduling and correction behavior.

```typescript
import type { WorkflowDefinition } from "../../index";
import { ExecutorRegistry } from "../../index";
export function createLoginWorkflowDefinition(executors:ExecutorRegistry):WorkflowDefinition{
  return {id:"google-login",version:"1",maxTotalAttempts:12,transitions:[],steps:[
    {id:"investigate",dependencies:[],executor:executors.resolve("workspace-investigation","1").metadata,inputPolicy:{id:"login-investigation-input",version:"1"},acceptancePolicy:{id:"login-investigation-acceptance",version:"1"},maxAttempts:2},
    {id:"specify",dependencies:["investigate"],executor:executors.resolve("login-specification","1").metadata,inputPolicy:{id:"login-specification-input",version:"1"},acceptancePolicy:{id:"login-specification-acceptance",version:"1"},maxAttempts:3},
    {id:"edit",dependencies:["specify"],executor:executors.resolve("workspace-editing","1").metadata,inputPolicy:{id:"login-editing-input",version:"1"},acceptancePolicy:{id:"login-editing-acceptance",version:"1"},maxAttempts:4},
    {id:"verify",dependencies:["edit"],executor:executors.resolve("verification","1").metadata,inputPolicy:{id:"login-verification-input",version:"1"},acceptancePolicy:{id:"login-verification-acceptance",version:"1"},maxAttempts:3}
  ]};
}
```

### `examples/workflows/createLoginWorkflowExample.ts`

Registers projections and supplied evidence-based acceptance policies, validates the immutable definition and returns its registry through public APIs. It does not execute the whole workflow or implement a persistence adapter.

```typescript
import { ExecutorRegistry,StepPolicyRegistry,WorkflowDefinitionContract,WorkflowDefinitionRegistry,TaskInputContract,EditingResultContract,VerificationInputContract,JsonValueContract } from "../../index";
import type { LoginAcceptancePolicies } from "./LoginAcceptancePolicies";
import { LoginInvestigationInputPolicy } from "./LoginInvestigationInputPolicy";
import { LoginDependencyInputPolicy } from "./LoginDependencyInputPolicy";
import { LoginVerificationInputPolicy } from "./LoginVerificationInputPolicy";
import { createLoginWorkflowDefinition } from "./createLoginWorkflowDefinition";
export async function createLoginWorkflowExample(executors:ExecutorRegistry,policies:StepPolicyRegistry,acceptance:LoginAcceptancePolicies):Promise<WorkflowDefinitionRegistry>{
  const json=new JsonValueContract(),tasks=new TaskInputContract(json);
  policies.registerInput({id:"login-investigation-input",version:"1"},new LoginInvestigationInputPolicy(tasks,json));
  policies.registerInput({id:"login-specification-input",version:"1"},new LoginDependencyInputPolicy("investigate",tasks,json));
  policies.registerInput({id:"login-editing-input",version:"1"},new LoginDependencyInputPolicy("specify",tasks,json));
  policies.registerInput({id:"login-verification-input",version:"1"},new LoginVerificationInputPolicy(new EditingResultContract(json),new VerificationInputContract(json),json));
  policies.registerAcceptance({id:"login-investigation-acceptance",version:"1"},acceptance.investigate);
  policies.registerAcceptance({id:"login-specification-acceptance",version:"1"},acceptance.specify);
  policies.registerAcceptance({id:"login-editing-acceptance",version:"1"},acceptance.edit);
  policies.registerAcceptance({id:"login-verification-acceptance",version:"1"},acceptance.verify);
  const definitions=new WorkflowDefinitionRegistry(new WorkflowDefinitionContract(json),executors,policies);
  await definitions.register(createLoginWorkflowDefinition(executors));return definitions;
}
```

### `tests/workflows/MemoryStepAttemptEntry.ts`

Defines mutable fixture-owned state, separate from public immutable receipts. It is never used as a production persistence schema.

```typescript
import type { StepAttemptClaim } from "../../workflows/StepAttemptClaim";
import type { StepAttemptReceipt } from "../../workflows/StepAttemptReceipt";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
export type MemoryStepAttemptEntry={claim:StepAttemptClaim;attemptNumber:number;stage:"claimed"|"prepared"|"dispatching"|"outcome";input:JsonValue|null;outcome:ExecutionOutcome<JsonValue>|null;receipt:StepAttemptReceipt|null};
```

### `tests/workflows/MemoryStepAttemptJournal.ts`

Exercises readiness, total/per-step caps, owner tokens, write-ahead dispatch, saved candidates and accepted-result exposure in one process. It supplies no SQL durability, inter-process locking, outbox or recovery implementation.

```typescript
import type { IStepAttemptJournal } from "../../workflows/IStepAttemptJournal";
import type { StepAttemptClaim } from "../../workflows/StepAttemptClaim";
import type { StepAttemptClaimOutcome } from "../../workflows/StepAttemptClaimOutcome";
import type { StepAttemptReceipt } from "../../workflows/StepAttemptReceipt";
import type { StepResultAcceptance } from "../../workflows/StepResultAcceptance";
import type { AcceptedStepResult } from "../../workflows/AcceptedStepResult";
import type { WorkflowDefinition } from "../../workflows/WorkflowDefinition";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import type { IClock } from "../../contracts/runtime/IClock";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
import type { MemoryStepAttemptEntry } from "./MemoryStepAttemptEntry";
import { StepExecutionError } from "../../errors/StepExecutionError";
export class MemoryStepAttemptJournal implements IStepAttemptJournal{
  private readonly commands=new Map<string,MemoryStepAttemptEntry>();
  private readonly attempts=new Map<string,MemoryStepAttemptEntry>();
  private readonly accepted=new Map<string,AcceptedStepResult>();
  constructor(private readonly definition:WorkflowDefinition,
    private readonly runId:string,
    private readonly scope:ExecutionScopeRef,
    private readonly clock:IClock,seed:readonly AcceptedStepResult[]=[]){for(const result of seed)this.accepted.set(result.stepId,result);}
  async claim(command:StepAttemptClaim):Promise<StepAttemptClaimOutcome>{
    const old=this.commands.get(command.commandId);if(old!==undefined){if(this.key(old.claim)!==this.key(command))throw new StepExecutionError();return {status:"existing",outcome:old.receipt!==null?{status:"recorded",receipt:old.receipt}:{status:"pending",attemptId:old.claim.attemptId,pendingOperationRefs:[old.claim.operationId]}};}
    const step=this.definition.steps.find(value=>value.id===command.step.id);
    if(command.runId!==this.runId||
        this.canonical(command.scope)!==this.canonical(this.scope)||
        command.workflow.id!==this.definition.id||
        command.workflow.version!==this.definition.version||
        step===undefined||
        this.canonical(step)!==this.canonical(command.step)||
        command.maxRunAttempts!==this.definition.maxTotalAttempts)throw new StepExecutionError();
    if([...this.attempts.values()].some(entry=>entry.receipt===null||
        (entry.outcome!==null&&entry.outcome.status!=="completed"&&entry.outcome.pendingOperationRefs.length>0)))return {status:"blocked",code:"STEP_ATTEMPT_BUSY"};
    if(this.attempts.size>=this.definition.maxTotalAttempts)return {status:"blocked",code:"RUN_ATTEMPT_LIMIT"};
    const attemptNumber=[...this.attempts.values()].filter(entry=>entry.claim.step.id===step.id).length+1;if(attemptNumber>step.maxAttempts)return {status:"blocked",code:"STEP_ATTEMPT_LIMIT"};
    if(!this.current(command))return {status:"blocked",code:"DEPENDENCY_NOT_ACCEPTED"};
    if(this.accepted.has(step.id))return {status:"blocked",code:"STEP_ALREADY_ACCEPTED"};
    if(this.attempts.has(command.attemptId))throw new StepExecutionError();
    const entry:MemoryStepAttemptEntry={claim:command,attemptNumber,stage:"claimed",input:null,outcome:null,receipt:null};this.commands.set(command.commandId,entry);this.attempts.set(command.attemptId,entry);return {status:"admitted",attemptNumber};
  }
  async prepare(attemptId:string,ownerToken:string,input:JsonValue):Promise<void>{const entry=this.own(attemptId,ownerToken);if(entry.stage!=="claimed")throw new StepExecutionError();entry.input=input;entry.stage="prepared";}
  async beginDispatch(attemptId:string,ownerToken:string):Promise<boolean>{const entry=this.own(attemptId,ownerToken);if(entry.stage!=="prepared")return false;entry.stage="dispatching";return true;}
  async recordOutcome(attemptId:string,ownerToken:string,outcome:ExecutionOutcome<JsonValue>):Promise<void>{const entry=this.own(attemptId,ownerToken);if(entry.outcome!==null&&this.canonical(entry.outcome)!==this.canonical(outcome))throw new StepExecutionError();entry.outcome=outcome;entry.stage="outcome";}
  async commit(attemptId:string,ownerToken:string,acceptance:StepResultAcceptance,context:IExecutionContext):Promise<StepAttemptReceipt>{
    const entry=this.own(attemptId,ownerToken);if(entry.receipt!==null)return entry.receipt;if(entry.outcome===null)throw new StepExecutionError();
    let actual=acceptance;
    if(actual.status==="accepted"&&(context.signal.aborted||
        (context.deadlineEpochMs!==null&&this.clock.nowEpochMs()>=context.deadlineEpochMs)||
        !this.current(entry.claim)))actual={status:"not-evaluated",code:"COMMIT_PRECONDITION_CHANGED",message:"Candidate retained; commit controls or dependencies changed."};
    if(actual.status==="accepted"&&entry.outcome.status!=="completed")throw new StepExecutionError();
    const claim=entry.claim;entry.receipt=Object.freeze({attemptId,stepRunId:claim.stepRunId,runId:claim.runId,stepId:claim.step.id,attemptNumber:entry.attemptNumber,workflow:claim.workflow,executor:claim.step.executor,viewRef:claim.view.viewRef,receiptRef:"step-receipt:"+attemptId,outcome:entry.outcome,acceptance:actual});
    if(actual.status==="accepted"&&entry.outcome.status==="completed")this.accepted.set(claim.step.id,Object.freeze({stepId:claim.step.id,attemptId,receiptRef:entry.receipt.receiptRef,result:entry.outcome.result}));return entry.receipt;
  }
  acceptedResult(stepId:string):AcceptedStepResult|null{return this.accepted.get(stepId)??null;}
  savedOutcome(attemptId:string):ExecutionOutcome<JsonValue>|null{return this.attempts.get(attemptId)?.outcome??null;}
  count():number{return this.attempts.size;}
  private own(attemptId:string,ownerToken:string):MemoryStepAttemptEntry{const entry=this.attempts.get(attemptId);if(entry===undefined||
        entry.claim.ownerToken!==ownerToken)throw new StepExecutionError();return entry;}
  private current(command:StepAttemptClaim):boolean{return command.step.dependencies.length===command.view.dependencies.length&&command.view.dependencies.every(dependency=>this.canonical(this.accepted.get(dependency.stepId))===this.canonical(dependency));}
  private key(command:StepAttemptClaim):string{return this.canonical({runId:command.runId,scope:command.scope,workflow:command.workflow,step:command.step,stepRunId:command.stepRunId,view:command.view,maxRunAttempts:command.maxRunAttempts});}
  private canonical(value:unknown):string{return JSON.stringify(value,(_key,item:unknown)=>item!==null&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([left],[right])=>left<right?-1:left>right?1:0)):item);}
}
```

### `examples/workflows/createStepRunnerExample.ts`

Shows exact public-API construction of StepRunner with shared JSON/outcome/view/receipt validators and required injected context verification and durable journal capabilities. Passing an in-memory journal remains an offline test choice, not production storage.

```typescript
import type { IStepContextVerifier,IStepAttemptJournal,IIdGenerator,IClock } from "../../index";
import { WorkflowDefinitionRegistry,ExecutorRegistry,StepPolicyRegistry,StepRunner,JsonValueContract,ExecutionOutcomeContract,StepInputPolicyInputContract,StepResultAcceptanceContract,StepAttemptReceiptContract } from "../../index";
export function createStepRunnerExample(definitions:WorkflowDefinitionRegistry,executors:ExecutorRegistry,policies:StepPolicyRegistry,verifier:IStepContextVerifier,journal:IStepAttemptJournal,ids:IIdGenerator,clock:IClock):StepRunner{
  const json=new JsonValueContract();
  const views=new StepInputPolicyInputContract(json);
  const outcomes=new ExecutionOutcomeContract(json,json);
  const decisions=new StepResultAcceptanceContract(json);
  const receipts=new StepAttemptReceiptContract(json,outcomes,decisions);
  return new StepRunner(definitions,executors,policies,views,outcomes,decisions,receipts,verifier,journal,json,ids,clock);
}
```

### `index.ts`

Append supported workflow definition, policy, view, runner and journal/receipt contracts. Application examples and in-memory fixtures remain private.

```typescript
export type { RegistrationRef } from "./contracts/RegistrationRef";
export { WorkflowDefinitionError } from "./errors/WorkflowDefinitionError";
export { StepExecutionError } from "./errors/StepExecutionError";
export type { StepDefinition } from "./workflows/StepDefinition";
export type { WorkflowTransitionDefinition } from "./workflows/WorkflowTransitionDefinition";
export type { WorkflowDefinition } from "./workflows/WorkflowDefinition";
export { WorkflowDefinitionContract } from "./workflows/WorkflowDefinitionContract";
export type { AcceptedStepResult } from "./workflows/AcceptedStepResult";
export type { StepInputPolicyInput } from "./workflows/StepInputPolicyInput";
export { StepInputPolicyInputContract } from "./workflows/StepInputPolicyInputContract";
export type { StepResultAcceptance } from "./workflows/StepResultAcceptance";
export type { StepAcceptanceDecision } from "./workflows/StepAcceptanceDecision";
export type { StepAcceptanceInput } from "./workflows/StepAcceptanceInput";
export { StepPolicyRegistry } from "./workflows/StepPolicyRegistry";
export { WorkflowDefinitionRegistry } from "./workflows/WorkflowDefinitionRegistry";
export type { IStepContextVerifier } from "./workflows/IStepContextVerifier";
export type { StepRunRequest } from "./workflows/StepRunRequest";
export type { StepAttemptClaim } from "./workflows/StepAttemptClaim";
export type { StepAttemptReceipt } from "./workflows/StepAttemptReceipt";
export type { StepRunOutcome } from "./workflows/StepRunOutcome";
export type { StepAttemptClaimOutcome } from "./workflows/StepAttemptClaimOutcome";
export type { IStepAttemptJournal } from "./workflows/IStepAttemptJournal";
export { StepResultAcceptanceContract } from "./workflows/StepResultAcceptanceContract";
export { StepAttemptReceiptContract } from "./workflows/StepAttemptReceiptContract";
export { StepRunner } from "./workflows/StepRunner";
```
