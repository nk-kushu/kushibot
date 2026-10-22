# 21. Executors and Result Contracts

## What We Implement Here

Create the four reusable executors: workspace investigation, structured tasks, workspace editing, and verification. Add strict input/result/outcome contracts and a versioned registry so StepRunner can invoke different capabilities through the existing IExecutor interface. Reuse AgenticMindUnit for agent-backed work and the registered tool dispatcher for actual checks; preserve stopped/failed/pending outcomes and keep schema validation distinct from evidence-based acceptance.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `errors/ExecutorContractError.ts` | `class ExecutorContractError extends Error` |
| `executors/TaskInput.ts` | `type TaskInput` |
| `executors/TaskInputContract.ts` | `class TaskInputContract implements IResultContract<TaskInput>` |
| `contracts/validation/ExecutionOutcomeContract.ts` | `class ExecutionOutcomeContract<TResult> implements IResultContract<ExecutionOutcome<TResult>>` |
| `executors/ValidatedExecutor.ts` | `class ValidatedExecutor<TInput, TResult> implements IExecutor<TInput, TResult>` |
| `executors/AgentTaskMode.ts` | `type AgentTaskMode` |
| `executors/AgentTaskAssignment.ts` | `type AgentTaskAssignment` |
| `executors/AgentTaskBindingRequest.ts` | `type AgentTaskBindingRequest` |
| `executors/DefaultAgentAssignmentPolicy.ts` | `class DefaultAgentAssignmentPolicy implements IPolicy<TaskInput, AgentTaskAssignment>` |
| `executors/AgentTaskBinding.ts` | `type AgentTaskBinding<TResult>` |
| `executors/IAgentTaskFactory.ts` | `interface IAgentTaskFactory<TResult>` |
| `executors/IAgentTaskSessionProvider.ts` | `interface IAgentTaskSessionProvider<TResult>` |
| `executors/SessionAgentTaskFactory.ts` | `class SessionAgentTaskFactory<TResult> implements IAgentTaskFactory<TResult>` |
| `executors/AgentTaskExecutor.ts` | `class AgentTaskExecutor<TResult> implements IExecutor<TaskInput, TResult>` |
| `executors/InvestigationResult.ts` | `type InvestigationResult` |
| `executors/InvestigationResultContract.ts` | `class InvestigationResultContract implements IResultContract<InvestigationResult>` |
| `executors/EditingResult.ts` | `type EditingResult` |
| `executors/EditingResultContract.ts` | `class EditingResultContract implements IResultContract<EditingResult>` |
| `executors/WorkspaceInvestigationExecutor.ts` | `class WorkspaceInvestigationExecutor implements IExecutor<TaskInput, InvestigationResult>` |
| `executors/WorkspaceEditingExecutor.ts` | `class WorkspaceEditingExecutor implements IExecutor<TaskInput, EditingResult>` |
| `executors/StructuredTaskExecutor.ts` | `class StructuredTaskExecutor<TResult> implements IExecutor<TaskInput, TResult>` |
| `executors/VerificationInput.ts` | `type VerificationInput` |
| `executors/VerificationInputContract.ts` | `class VerificationInputContract implements IResultContract<VerificationInput>` |
| `executors/VerificationCheckResult.ts` | `type VerificationCheckResult` |
| `executors/VerificationCheckResultContract.ts` | `class VerificationCheckResultContract implements IResultContract<VerificationCheckResult>` |
| `executors/VerificationResult.ts` | `type VerificationResult` |
| `executors/VerificationResultContract.ts` | `class VerificationResultContract implements IResultContract<VerificationResult>` |
| `executors/VerificationCheckRegistration.ts` | `type VerificationCheckRegistration` |
| `executors/IVerificationReceiptVerifier.ts` | `interface IVerificationReceiptVerifier` |
| `executors/VerificationExecutor.ts` | `class VerificationExecutor implements IExecutor<VerificationInput, VerificationResult>` |
| `executors/ExecutorMetadata.ts` | `type ExecutorMetadata` |
| `executors/contracts/IExecutorRegistration.ts` | `interface IExecutorRegistration extends IExecutor<unknown, JsonValue>` |
| `executors/ExecutorRegistration.ts` | `class ExecutorRegistration<TInput, TResult> implements IExecutorRegistration` |
| `executors/ExecutorRegistry.ts` | `class ExecutorRegistry` |
| `examples/executors/LoginSpecificationResult.ts` | `type LoginSpecificationResult` |
| `examples/executors/LoginSpecificationContract.ts` | `class LoginSpecificationContract implements IResultContract<LoginSpecificationResult>` |
| `examples/executors/LoginExecutorsExample.ts` | `class LoginExecutorsExample` |
| `executors/IVerificationTargetResolver.ts` | `interface IVerificationTargetResolver` |
| `executors/RecordedVerificationReceiptVerifier.ts` | `class RecordedVerificationReceiptVerifier implements IVerificationReceiptVerifier` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [page 01](01-scope-and-implementation-roadmap.md) and [page 02](02-package-structure-and-oop-conventions.md) for general OOP, separate-file, interface-name and writing rules. Reuse the existing `IExecutor<TInput,TResult>`, `IExecutionContext`, `ExecutionOutcome<TResult>`, `IResultContract<TResult>`, `ValidationResult` and one shared `IPolicy`; do not redeclare them. These files specify future source in KushiBot, not an installed implementation.
- A workflow step is an assignment; an executor is a reusable capability. The four defaults are `WorkspaceInvestigationExecutor`, `StructuredTaskExecutor<TResult>`, `WorkspaceEditingExecutor`, and `VerificationExecutor`. The future StepRunner resolves a versioned registration, prepares selected input through the step's policy, calls `execute`, validates/accepts and durably saves the outcome before dependents consume it. Executors do not select workflow transitions, save a whole WorkflowRun, approve publication, or mark a workflow completed. StepRunner/engine ownership belongs to pages 22–23.
- `TaskInput` is selected assignment data, not the full workflow state or a service container. Every source/artifact/snapshot reference requires ordinary scope/provenance authorization. Requested exact file paths cannot widen inherited tool/workspace permissions; an empty path list grants no workspace files. Clients, functions, SDK responses, signals, open handles and class instances do not belong in persisted input/results. Live collaborators remain constructor dependencies and runtime context.
- `ValidatedExecutor` accepts only finite JSON input and caps raw/normalized input at 64 KiB, then uses the typed contract. Contracts are deterministic validators/normalizers, not paid models, tools, evidence readers or acceptance policies. Invalid input returns `failed/EXECUTOR_INPUT_REJECTED` before work. Cancellation/deadline before dispatch returns explicit `stopped` with no pending operation. Post-execution invalid output throws `ExecutorContractError`: effects may already exist, so it must not become a success, a no-effects failure, or permission to retry.
- `ExecutionOutcomeContract<TResult>` validates the common envelope, preserves stopped/failed partials and pending lists, and validates finite-JSON-compatible completed values against their registered result contract. The 64-KiB envelope limit, 16-KiB partial summary, bounded references and existing JSON node/depth limits all apply. Large reports live in authorized artifacts; do not silently truncate authoritative results or pending identities. The page-20 `ChildOutcomeContract` remains the intentionally tighter 32-KiB child-delivery boundary; it is not the generic executor contract or a second runtime.
- Registry type erasure is explicit: `IExecutorRegistration` accepts `unknown`, while `ExecutorRegistration<TInput,TResult>` adapts a typed executor through runtime validation. The local `as TInput` only passes raw data into the validating decorator; it does not authorize execution or skip validation. The final JSON cast follows full outcome validation and immutable JSON copying. Constructor contracts are trusted and must use JSON-compatible structural types; a normalizer cannot return a live class/client and rely on an assertion to persist it.
- Each registration pins executor ID/version and input/result contract ID/version. `ExecutorRegistry` copies/freeze-binds metadata, rejects duplicate ID/version and caps registrations at 128. Resolve the exact pair, never “latest”. Fixes changing behavior/schema require a new version or an explicit compatible migration; matching names do not prove matching implementation. Step definitions and recovery records must retain these identities. No module-global mutable registry or provider/executor-name switch is introduced.
- Built-in public executors validate their boundaries even when invoked directly. A registration validates again to support arbitrary custom executors and pins its own declared contracts. This can repeat pure validation, but never repeats work/model/tool execution. Registration contracts must match the concrete executor's configured input/result semantics; a mismatch must fail before it can be treated as an accepted step result. Do not make validators perform paid or stateful acceptance work just because they run more than once.
- The three agent-backed defaults delegate to the existing page-19 `AgenticMindUnit`; no duplicate conversation/model/tool loop exists. `DefaultAgentAssignmentPolicy` adds stable task guidance through `IPolicy<TaskInput,AgentTaskAssignment>` while original goal, criteria, sources and exact paths remain separately available to session assembly. A custom policy cannot remove inherited mandatory requirements, uncertain operations, controls or permissions. Dynamic evidence stays dynamic context; stable instructions flow through pages 16–17 so provider prompt caching remains possible without an answer cache.
- `SessionAgentTaskFactory` creates fresh operation/session identities per invocation and links them to the executor operation while preserving run/step/scope, signal and deadline. It constructs the real AgenticMindUnit. `IAgentTaskSessionProvider<TResult>` is required application-owned assembly: bind original criteria, scoped sources and required guards, choose an eligible pinned model, install result/independent completion acceptance, select permitted tools, use the inherited shared ledger and remaining caps, and implement page-19 context/session journaling. No production capability claim is justified by a fake provider or an interface alone. Factory construction must not execute a model/tool or alter files before the unit runs.
- Mandatory modes are fixed by the concrete classes: investigate is read-only; structured produces specifications/reviews with no editing/publication powers; edit permits only accepted working-copy changes. Trusted composition enforces these modes through capability registrations, not instruction text. The generic internal adapter passes the mode; it does not guess tool safety from names. Inject registered builders/capability sets rather than adding mode/provider-name behavior switches. The returned binding is checked for inherited scope/lineage/controls before dispatch; the provider still must enforce actual tool capabilities.
- Investigation findings cite bounded references, and editing results identify base/result snapshots, changed paths and saved change artifacts. Their contracts check structure, not source truth. Session acceptance verifies actual inspected source, current revisions, change artifacts, required guards and unresolved criteria. An editing report cannot claim a change is published or tests passed without their separate receipts. A no-change result may retain its snapshot; nonempty changes require distinct snapshots and change refs. Editing tools still use page-14 exact scope, CAS and sequential editing controls; creating a session is not file isolation.
- `StructuredTaskExecutor<TResult>` is generic rather than a separate class for every requested report. Configure its registered contract and acceptance policy for a specification, review, plan or another JSON-compatible shape. The example `LoginSpecificationContract` is application code and deliberately remains outside the framework public exports. It demonstrates how `TResult` becomes a concrete TypeScript type without changing the executor implementation. Do not replace semantic review acceptance with “valid JSON”.
- Verification resolves every requested check ID before starting any. It dispatches the configured tool/version through the existing page-13 authorization, budget, operation-journal and timeout boundary. `Pick<ToolDispatcher,"dispatch">` is a TypeScript type exposing only that existing capability for injection; it creates no second dispatcher or runtime interface. The executor owns no shell commands, arbitrary executables, process launch, environment or workspace materialization. Actual check tools are trusted host registrations and must execute against the requested immutable snapshot in a permitted environment.
- `VerificationCheckResult` is a bounded result wrapper, not a new saved receipt schema. `RecordedVerificationReceiptVerifier` reuses page 15’s existing `VerificationReceipt`, `IVerificationReceiptReader` and `IGuardTargetVerifier`, through a trusted snapshot-to-target resolver. Check versions and tool versions are distinct and both are pinned. The resolver/reader must authenticate snapshot, producer and check configuration; the adapter itself does not launch processes.
- `IVerificationReceiptVerifier` must verify authorized saved evidence, integrity, producer/check identity, actual check configuration, exit/output status and exact source snapshot. This is a required deterministic integration capability, not a model self-report. A matching checkId, receipt string, provider output, shape-valid object or fake verifier is insufficient. Page 14's SQL text workspace does not itself provide a native build/test process: real process/environment adapters and their durable check receipts must exist before claiming real lint/type/test execution. These integrations are injected, not fabricated by the example.
- A verification `completed` outcome means all requested checks finished and produced verified receipts. Its result can have `passed:false`: for example, typecheck passed and expired-login test failed. That is a useful completed checking task and lets an allowed workflow policy request correction later. An unknown/unavailable check or rejected tool returns a failed/incomplete executor outcome; cancellation, deadline, budget exhaustion and unknown effects stop with partial receipts. Unverified/wrong-version/wrong-snapshot receipts preserve the operation as pending rather than claiming the check passed.
- Check tools run sequentially with new host-generated child operation IDs and parent links; each uses normal tool-call accounting in the inherited ledger. No LLM call is needed to decide pass/fail. Before and after each verified receipt, respect control boundaries. If cancellation arrives after known evidence was saved, preserve that receipt in partial progress. Underlying timed-out effects remain pending according to the dispatcher; never infer safe completion from the caller's timeout. No free retry, closing inference, hidden repair loop or unbounded check recursion occurs.
- A wrapper does not erase a known returned outcome merely because the caller becomes cancelled during validation; it returns the validated evidence/outcome. The owning StepRunner rechecks controls and required acceptance/persistence before committing workflow success. Unexpected executor/policy/factory/verifier/storage exceptions propagate to that owner. Required operation identity must already be journaled by the owning step/session/tool boundary before effects; this page adds no pretend atomic transaction spanning those stores. Required failure/recovery handling and no automatic effect replay remain page-24 responsibilities.
- Partial outcomes remain partial: preserve known findings/check receipts, explicit failed or unchecked requirements, and pending operation references. For example, if typecheck finished before the expiry-check budget was denied, return stopped with the typecheck receipt and “Check incomplete: expiry-test”. A parent can report the supported progress or prepare an authorized next step; it cannot use that outcome as successful verification. Unexpected malformed post-effect output must remain visible to journal/recovery rather than becoming a convenient fabricated partial.
- The public-API example registers investigation, login specification, editing and verification. It does not execute the future workflow engine or assert that source was inspected, code changed or tests ran. The next phase supplies StepDefinition and StepRunner, including selected input, acceptance and durable outcome recording. Optional safe tracing records IDs/versions/status/counters only; do not log task/source/prompt text, secrets or private reasoning. Required usage/results/evidence remain independent of optional logging.
- Verification should cover invalid input before effects, duplicate/unknown registrations, exact version resolution, immutable normalized data, malformed/non-JSON results, stopped/pending preservation, fixed capability modes, fresh session identities/shared controls, schema-vs-semantic acceptance, actual unit reuse, preflight check lookup, mixed pass/fail receipts, wrong snapshot/tool version, receipt verification rejection, cancellation after known evidence, budget denial after one check, and no hidden retry. Offline fakes exercise orchestration without paid calls; actual tool/process/provider/source adapters require their own integration evidence before production claims.

## TypeScript Code for Each File

### `errors/ExecutorContractError.ts`

Reports invalid trusted executor registration or a malformed post-execution outcome. It does not hide an effect as a successful or safely retriable failure.

```typescript
export class ExecutorContractError extends Error {
  readonly code = "EXECUTOR_CONTRACT_INVALID";
  constructor() { super("Executor registration, configuration, or returned outcome is invalid."); this.name = "ExecutorContractError"; }
}
```

### `executors/TaskInput.ts`

Supplies the selected assignment to an agent-backed executor. References and file paths remain subject to scoped authorization; the input grants no capability by itself.

```typescript
export type TaskInput = Readonly<{ goal: string; acceptanceCriteria: readonly string[]; sourceRefs: readonly string[]; filePaths: readonly string[] }>;
```

### `executors/TaskInputContract.ts`

Validates bounded finite JSON and exact workspace-relative paths before any assignment policy, session construction or model call.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { TaskInput } from "./TaskInput";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class TaskInputContract implements IResultContract<TaskInput> {
  readonly id = "executor-task-input"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<TaskInput>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 16384 ||
        row === null ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.keys(row).length !== 4 ||
        !["goal","acceptanceCriteria","sourceRefs","filePaths"].every(key => Object.prototype.hasOwnProperty.call(row,key)) ||
        typeof row.goal !== "string" ||
        !row.goal.trim() ||
        row.goal.length > 2048 ||
        !this.list(row.acceptanceCriteria,16,512) ||
        row.acceptanceCriteria.length === 0 ||
        !this.list(row.sourceRefs,16,256) ||
        !this.list(row.filePaths,16,256) ||
        !row.filePaths.every(path => /^[A-Za-z0-9_.@/-]+$/.test(path) && !path.startsWith("/") && path.split("/").every(part => part !== "" && part !== "." && part !== ".."))) return { valid: false, issues: [{ path: [], code: "INVALID_TASK_INPUT", message: "Executor task input is invalid." }] };
    return { valid: true, value: checked.value as unknown as TaskInput };
  }
  private list(value: unknown,max: number,length: number): value is readonly string[] { return Array.isArray(value) && value.length <= max && value.every(item => typeof item === "string" && item.trim().length > 0 && item.length <= length) && new Set(value).size === value.length; }
}
```

### `contracts/validation/ExecutionOutcomeContract.ts`

Validates the shared completed/stopped/failed envelope and JSON-compatible result. Preserves stopped/failed partial work and pending references; completed data still needs separate semantic acceptance.

```typescript
import type { ExecutionOutcome } from "../outcomes/ExecutionOutcome";
import type { IResultContract } from "./IResultContract";
import type { ValidationResult } from "./ValidationResult";
import { JsonValueContract } from "../../persistence/JsonValueContract";
export class ExecutionOutcomeContract<TResult> implements IResultContract<ExecutionOutcome<TResult>> {
  readonly id: string; readonly version = "1";
  constructor(private readonly result: IResultContract<TResult>, private readonly json: JsonValueContract) { this.id = "execution-outcome:" + result.id; }
  async validate(raw: unknown): Promise<ValidationResult<ExecutionOutcome<TResult>>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 65536) return this.invalid();
    const row = checked.value as unknown as Record<string,unknown>;
    if (!this.object(row)) return this.invalid();
    if (row.status === "completed" && this.keys(row,["status","result"])) {
      const result = await this.result.validate(row.result); if (!result.valid) return result;
      const copy = await this.json.validate(result.value); if (!copy.valid) return this.invalid();
      const value = Object.freeze({ status: "completed" as const, result: copy.value as unknown as TResult });
      if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 65536) return this.invalid();
      return { valid: true, value };
    }
    if (row.status !== "stopped" && row.status !== "failed") return this.invalid();
    const reason = row.status === "stopped" ? row.reason : row.error;
    if (!this.keys(row,row.status === "stopped" ? ["status","reason","partial","pendingOperationRefs"] : ["status","error","partial","pendingOperationRefs"]) ||
        !this.object(reason) ||
        !this.keys(reason,["code","message"]) ||
        !this.text(reason.code,128) ||
        !this.text(reason.message,1024) ||
        !this.list(row.pendingOperationRefs,64,256)) return this.invalid();
    if (row.status === "stopped" && !["limit-reached","deadline-reached","cancelled","no-progress"].includes(reason.code as string)) return this.invalid();
    const partial = row.partial;
    if (!this.object(partial) ||
        !this.keys(partial,["summary","evidenceRefs","artifactRefs","unresolved"]) ||
        typeof partial.summary !== "string" ||
        partial.summary.length > 16384 ||
        !this.list(partial.evidenceRefs,32,256) ||
        !this.list(partial.artifactRefs,32,256) ||
        !this.list(partial.unresolved,32,1024)) return this.invalid();
    return { valid: true, value: checked.value as unknown as ExecutionOutcome<TResult> };
  }
  private object(value: unknown): value is Record<string,unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string,unknown>,keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private text(value: unknown,max: number): boolean { return typeof value === "string" && value.length > 0 && value.length <= max; }
  private list(value: unknown,max: number,length: number): boolean { return Array.isArray(value) && value.length <= max && value.every(item => this.text(item,length)) && new Set(value).size === value.length; }
  private invalid(): ValidationResult<never> { return { valid: false, issues: [{ path: [], code: "INVALID_EXECUTION_OUTCOME", message: "Executor outcome does not satisfy its bounded contract." }] }; }
}
```

### `executors/ValidatedExecutor.ts`

Wraps one executor with immutable JSON input, typed input/outcome validation, and pre-dispatch controls. Invalid input fails before work; invalid output after possible effects throws for the owning journal/recovery boundary.

```typescript
import type { IExecutor } from "./contracts/IExecutor";
import type { IExecutionContext } from "./contracts/IExecutionContext";
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { IClock } from "../contracts/runtime/IClock";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { ExecutorContractError } from "../errors/ExecutorContractError";
export class ValidatedExecutor<TInput,TResult> implements IExecutor<TInput,TResult> {
  constructor(private readonly input: IResultContract<TInput>,
    private readonly outcomes: ExecutionOutcomeContract<TResult>,
    private readonly inner: IExecutor<TInput,TResult>,
    private readonly json: JsonValueContract,
    private readonly clock: IClock) {}
  async execute(raw: TInput, context: IExecutionContext): Promise<ExecutionOutcome<TResult>> {
    const guard = new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);
    const before = guard.check(); if (before !== null) return { status: "stopped", reason: before, partial: { summary: "", evidenceRefs: [], artifactRefs: [], unresolved: ["Executor did not start."] }, pendingOperationRefs: [] };
    const finite = await this.json.validate(raw);
    const checked = finite.valid && new TextEncoder().encode(JSON.stringify(finite.value)).byteLength <= 65536 ? await this.input.validate(finite.value) : finite;
    if (!checked.valid) return { status: "failed", error: { code: "EXECUTOR_INPUT_REJECTED", message: "Executor input failed validation." }, partial: { summary: "", evidenceRefs: [], artifactRefs: [], unresolved: ["Supply valid executor input."] }, pendingOperationRefs: [] };
    const immutable = await this.json.validate(checked.value); if (!immutable.valid ||
        new TextEncoder().encode(JSON.stringify(immutable.value)).byteLength > 65536) throw new ExecutorContractError();
    const after = guard.check(); if (after !== null) return { status: "stopped", reason: after, partial: { summary: "", evidenceRefs: [], artifactRefs: [], unresolved: ["Executor did not start."] }, pendingOperationRefs: [] };
    const outcome = await this.outcomes.validate(await this.inner.execute(immutable.value as unknown as TInput,context));
    if (!outcome.valid) throw new ExecutorContractError();
    return outcome.value;
  }
}
```

### `executors/AgentTaskMode.ts`

Names fixed capability profiles selected by built-in executor configuration, never by a model-written prompt.

```typescript
export type AgentTaskMode = "investigate" | "structured" | "edit";
```

### `executors/AgentTaskAssignment.ts`

Adds bounded task-specific guidance while preserving the original selected input separately for host verification. This is assignment data, not privileged provider transport fields.

```typescript
export type AgentTaskAssignment = Readonly<{ instructions: string }>;
```

### `executors/AgentTaskBindingRequest.ts`

Binds authoritative selected input and a mandatory capability mode to optional task guidance. The session provider receives all three rather than trusting guidance to define permissions.

```typescript
import type { TaskInput } from "./TaskInput";
import type { AgentTaskAssignment } from "./AgentTaskAssignment";
import type { AgentTaskMode } from "./AgentTaskMode";
export type AgentTaskBindingRequest = Readonly<{ input: TaskInput; assignment: AgentTaskAssignment; mode: AgentTaskMode }>;
```

### `executors/DefaultAgentAssignmentPolicy.ts`

Supplies fixed reusable guidance through the shared policy interface; it does not rewrite goals, criteria, scope, budgets or tool permissions.

```typescript
import type { IPolicy } from "../contracts/IPolicy";
import type { TaskInput } from "./TaskInput";
import type { AgentTaskAssignment } from "./AgentTaskAssignment";
import { ExecutorContractError } from "../errors/ExecutorContractError";
export class DefaultAgentAssignmentPolicy implements IPolicy<TaskInput,AgentTaskAssignment> {
  constructor(private readonly instructions: string) { if (!instructions.trim() || instructions.length > 4096) throw new ExecutorContractError(); }
  async apply(_input: TaskInput): Promise<AgentTaskAssignment> { return Object.freeze({ instructions: this.instructions }); }
}
```

### `executors/AgentTaskBinding.ts`

Pairs a fresh AgenticMindUnit with its host-generated session/operation identity. It is live runtime state and must not be serialized as a task result.

```typescript
import type { IExecutionContext } from "./contracts/IExecutionContext";
import type { AgenticMindUnit } from "../agentic/sessions/AgenticMindUnit";
export type AgentTaskBinding<TResult> = Readonly<{ unit: AgenticMindUnit<TResult>; context: IExecutionContext }>;
```

### `executors/IAgentTaskFactory.ts`

Creates a session-bound agent for the mandatory capability mode. Model/tool/session details remain behind this capability rather than being duplicated in executor classes.

```typescript
import type { AgentTaskBindingRequest } from "./AgentTaskBindingRequest";
import type { AgentTaskBinding } from "./AgentTaskBinding";
import type { IExecutionContext } from "./contracts/IExecutionContext";
export interface IAgentTaskFactory<TResult> { create(request: AgentTaskBindingRequest, context: IExecutionContext): Promise<AgentTaskBinding<TResult>>; }
```

### `executors/IAgentTaskSessionProvider.ts`

Defines application-owned session assembly. It must enforce mode-specific capabilities, scoped sources, original criteria, required guards, pinned model, shared budget, result acceptance and page-19 durable context/session adapters.

```typescript
import type { AgentTaskBindingRequest } from "./AgentTaskBindingRequest";
import type { IExecutionContext } from "./contracts/IExecutionContext";
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { IAgenticSessionFactory } from "../agentic/sessions/IAgenticSessionFactory";
export interface IAgentTaskSessionProvider<TResult> { create(request: AgentTaskBindingRequest, result: IResultContract<TResult>, context: IExecutionContext): Promise<IAgenticSessionFactory<TResult>>; }
```

### `executors/SessionAgentTaskFactory.ts`

Creates fresh session and operation identities, preserving parent run/scope/deadline/signal. It constructs the actual AgenticMindUnit; the injected provider assembles the session collaborators.

```typescript
import type { IAgentTaskFactory } from "./IAgentTaskFactory";
import type { IAgentTaskSessionProvider } from "./IAgentTaskSessionProvider";
import type { AgentTaskBindingRequest } from "./AgentTaskBindingRequest";
import type { AgentTaskBinding } from "./AgentTaskBinding";
import type { IExecutionContext } from "./contracts/IExecutionContext";
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import { AgenticMindUnit } from "../agentic/sessions/AgenticMindUnit";
import { ExecutorContractError } from "../errors/ExecutorContractError";
export class SessionAgentTaskFactory<TResult> implements IAgentTaskFactory<TResult> {
  constructor(private readonly sessions: IAgentTaskSessionProvider<TResult>, private readonly result: IResultContract<TResult>, private readonly ids: IIdGenerator) {}
  async create(request: AgentTaskBindingRequest, context: IExecutionContext): Promise<AgentTaskBinding<TResult>> {
    const sessionId = this.ids.nextId(), operationId = this.ids.nextId();
    if (![sessionId,operationId].every(value => /^[A-Za-z0-9_.:-]{1,128}$/.test(value)) ||
        sessionId === operationId ||
        [sessionId,operationId].some(value => value === context.identity.sessionId ||
        value === context.identity.operationId)) throw new ExecutorContractError();
    const child: IExecutionContext = Object.freeze({ ...context, scope: Object.freeze({...context.scope}), identity: Object.freeze({ ...context.identity, sessionId, operationId, parentOperationId: context.identity.operationId }) });
    const factory = await this.sessions.create(request,this.result,child);
    return Object.freeze({ unit: new AgenticMindUnit(factory), context: child });
  }
}
```

### `executors/AgentTaskExecutor.ts`

Adapts assignment preparation to one ordinary AgenticMindUnit invocation. There is no second model/tool loop, automatic retry, direct provider client, or task-result cache.

```typescript
import type { IExecutor } from "./contracts/IExecutor";
import type { IExecutionContext } from "./contracts/IExecutionContext";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { IPolicy } from "../contracts/IPolicy";
import type { IClock } from "../contracts/runtime/IClock";
import type { TaskInput } from "./TaskInput";
import type { AgentTaskMode } from "./AgentTaskMode";
import type { AgentTaskAssignment } from "./AgentTaskAssignment";
import type { IAgentTaskFactory } from "./IAgentTaskFactory";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { ExecutorContractError } from "../errors/ExecutorContractError";
export class AgentTaskExecutor<TResult> implements IExecutor<TaskInput,TResult> {
  constructor(private readonly mode: AgentTaskMode,
    private readonly policy: IPolicy<TaskInput,AgentTaskAssignment>,
    private readonly factory: IAgentTaskFactory<TResult>,
    private readonly clock: IClock) { if (!["investigate","structured","edit"].includes(mode)) throw new ExecutorContractError(); }
  async execute(input: TaskInput, context: IExecutionContext): Promise<ExecutionOutcome<TResult>> {
    const guard = new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);
    const before = guard.check(); if (before !== null) return this.stopped(before);
    const assignment = await this.policy.apply(input);
    if (typeof assignment.instructions !== "string" ||
        !assignment.instructions.trim() ||
        assignment.instructions.length > 4096 ||
        Object.keys(assignment).length !== 1) throw new ExecutorContractError();
    const after = guard.check(); if (after !== null) return this.stopped(after);
    const binding = await this.factory.create(Object.freeze({ input, mode: this.mode, assignment: Object.freeze({instructions: assignment.instructions}) }),context);
    const child = binding.context;
    if (child.signal !== context.signal ||
        child.scope.scopeId !== context.scope.scopeId ||
        child.scope.projectId !== context.scope.projectId ||
        child.scope.workspaceId !== context.scope.workspaceId ||
        child.identity.runId !== context.identity.runId ||
        child.identity.stepRunId !== context.identity.stepRunId ||
        child.identity.parentOperationId !== context.identity.operationId ||
        typeof child.identity.sessionId !== "string" ||
        child.identity.sessionId === context.identity.sessionId ||
        child.identity.operationId === context.identity.operationId ||
        (context.deadlineEpochMs !== null && (child.deadlineEpochMs === null ||
        child.deadlineEpochMs > context.deadlineEpochMs))) throw new ExecutorContractError();
    const ready = guard.check(); if (ready !== null) return this.stopped(ready);
    return binding.unit.execute(undefined,binding.context);
  }
  private stopped(reason: import("../execution-control/ExecutionStopReason").ExecutionStopReason): ExecutionOutcome<TResult> { return { status: "stopped", reason, partial: { summary: "", evidenceRefs: [], artifactRefs: [], unresolved: ["Agent task did not start."] }, pendingOperationRefs: [] }; }
}
```

### `executors/InvestigationResult.ts`

Returns bounded source-linked findings and open questions. Reference strings are not proof that sources were inspected; the session acceptance and source verifier establish that.

```typescript
export type InvestigationResult = Readonly<{ summary: string; findings: readonly Readonly<{ text: string; sourceRefs: readonly string[] }>[]; unresolved: readonly string[] }>;
```

### `executors/InvestigationResultContract.ts`

Checks the investigation result shape and bounds, requiring every finding to cite at least one reference. It performs no model inference and does not attest source truth.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { InvestigationResult } from "./InvestigationResult";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class InvestigationResultContract implements IResultContract<InvestigationResult> {
  readonly id = "workspace-investigation-result"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<InvestigationResult>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (!this.object(row) ||
        !this.keys(row,["summary","findings","unresolved"]) ||
        !this.text(row.summary,2048) ||
        !Array.isArray(row.findings) ||
        row.findings.length > 16 ||
        !this.list(row.unresolved,16,512)) return this.invalid();
    for (const finding of row.findings) if (!this.object(finding) ||
        !this.keys(finding,["text","sourceRefs"]) ||
        !this.text(finding.text,1024) ||
        !this.list(finding.sourceRefs,8,256) ||
        finding.sourceRefs.length === 0) return this.invalid();
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 32768) return this.invalid();
    return { valid: true, value: checked.value as unknown as InvestigationResult };
  }
  private object(value: unknown): value is Record<string,unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string,unknown>,keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private text(value: unknown,max: number): boolean { return typeof value === "string" && value.trim().length > 0 && value.length <= max; }
  private list(value: unknown,max: number,length: number): value is readonly string[] { return Array.isArray(value) && value.length <= max && value.every(item => this.text(item,length)) && new Set(value).size === value.length; }
  private invalid(): ValidationResult<never> { return { valid: false, issues: [{path: [],code: "INVALID_INVESTIGATION_RESULT",message: "Investigation result is invalid."}] }; }
}
```

### `executors/EditingResult.ts`

Describes saved changes between identified working-copy snapshots. This is a change report, not publication approval or confirmation that tests passed.

```typescript
export type EditingResult = Readonly<{ summary: string; baseSnapshotRef: string; resultSnapshotRef: string; changedPaths: readonly string[]; changeArtifactRefs: readonly string[]; unresolved: readonly string[] }>;
```

### `executors/EditingResultContract.ts`

Checks snapshot/change-report shape and bounds. Nonempty changes require saved artifact references and a different result snapshot; source/CAS/artifact verification remains an independent acceptance responsibility.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { EditingResult } from "./EditingResult";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class EditingResultContract implements IResultContract<EditingResult> {
  readonly id = "workspace-editing-result"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<EditingResult>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (row === null ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.keys(row).length !== 6 ||
        !["summary","baseSnapshotRef","resultSnapshotRef","changedPaths","changeArtifactRefs","unresolved"].every(key => Object.prototype.hasOwnProperty.call(row,key)) ||
        !this.text(row.summary,2048) ||
        !this.text(row.baseSnapshotRef,256) ||
        !this.text(row.resultSnapshotRef,256) ||
        !this.list(row.changedPaths,16,256) ||
        !row.changedPaths.every(path => /^[A-Za-z0-9_.@/-]+$/.test(path) && !path.startsWith("/") && path.split("/").every(part => part !== "" && part !== "." && part !== "..")) ||
        !this.list(row.changeArtifactRefs,16,256) ||
        !this.list(row.unresolved,16,512) ||
        (row.changedPaths.length > 0 && (row.changeArtifactRefs.length === 0 ||
        row.baseSnapshotRef === row.resultSnapshotRef))) return {valid: false,issues: [{path: [],code: "INVALID_EDITING_RESULT",message: "Editing result is invalid."}]};
    return { valid: true, value: checked.value as unknown as EditingResult };
  }
  private text(value: unknown,max: number): boolean { return typeof value === "string" && value.trim().length > 0 && value.length <= max; }
  private list(value: unknown,max: number,length: number): value is readonly string[] { return Array.isArray(value) && value.length <= max && value.every(item => this.text(item,length)) && new Set(value).size === value.length; }
}
```

### `executors/WorkspaceInvestigationExecutor.ts`

Runs a read-only, evidence-backed investigation through AgenticMindUnit. The trusted session provider must omit editing/publication capabilities regardless of the assignment text.

```typescript
import type { InvestigationResult } from "./InvestigationResult";
import { InvestigationResultContract } from "./InvestigationResultContract";

import type { IExecutor } from "./contracts/IExecutor";
import type { IExecutionContext } from "./contracts/IExecutionContext";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { IPolicy } from "../contracts/IPolicy";
import type { IClock } from "../contracts/runtime/IClock";
import type { TaskInput } from "./TaskInput";
import type { AgentTaskAssignment } from "./AgentTaskAssignment";
import type { IAgentTaskFactory } from "./IAgentTaskFactory";
import { TaskInputContract } from "./TaskInputContract";
import { AgentTaskExecutor } from "./AgentTaskExecutor";
import { ValidatedExecutor } from "./ValidatedExecutor";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class WorkspaceInvestigationExecutor implements IExecutor<TaskInput,InvestigationResult> {
  private readonly checked: ValidatedExecutor<TaskInput,InvestigationResult>;
  constructor(input: TaskInputContract, result: InvestigationResultContract, policy: IPolicy<TaskInput,AgentTaskAssignment>, factory: IAgentTaskFactory<InvestigationResult>, json: JsonValueContract, clock: IClock) {
    this.checked = new ValidatedExecutor(input,new ExecutionOutcomeContract(result,json),new AgentTaskExecutor("investigate",policy,factory,clock),json,clock);
  }
  execute(input: TaskInput, context: IExecutionContext): Promise<ExecutionOutcome<InvestigationResult>> { return this.checked.execute(input,context); }
}
```

### `executors/WorkspaceEditingExecutor.ts`

Runs scoped working-copy edits through AgenticMindUnit and the existing workspace tools. It returns change references and cannot publish changes.

```typescript
import type { EditingResult } from "./EditingResult";
import { EditingResultContract } from "./EditingResultContract";

import type { IExecutor } from "./contracts/IExecutor";
import type { IExecutionContext } from "./contracts/IExecutionContext";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { IPolicy } from "../contracts/IPolicy";
import type { IClock } from "../contracts/runtime/IClock";
import type { TaskInput } from "./TaskInput";
import type { AgentTaskAssignment } from "./AgentTaskAssignment";
import type { IAgentTaskFactory } from "./IAgentTaskFactory";
import { TaskInputContract } from "./TaskInputContract";
import { AgentTaskExecutor } from "./AgentTaskExecutor";
import { ValidatedExecutor } from "./ValidatedExecutor";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class WorkspaceEditingExecutor implements IExecutor<TaskInput,EditingResult> {
  private readonly checked: ValidatedExecutor<TaskInput,EditingResult>;
  constructor(input: TaskInputContract, result: EditingResultContract, policy: IPolicy<TaskInput,AgentTaskAssignment>, factory: IAgentTaskFactory<EditingResult>, json: JsonValueContract, clock: IClock) {
    this.checked = new ValidatedExecutor(input,new ExecutionOutcomeContract(result,json),new AgentTaskExecutor("edit",policy,factory,clock),json,clock);
  }
  execute(input: TaskInput, context: IExecutionContext): Promise<ExecutionOutcome<EditingResult>> { return this.checked.execute(input,context); }
}
```

### `executors/StructuredTaskExecutor.ts`

Produces any registered JSON-compatible structured result, such as a specification or review report, through the same agent loop. It receives a deterministic result contract and independent session acceptance.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";

import type { IExecutor } from "./contracts/IExecutor";
import type { IExecutionContext } from "./contracts/IExecutionContext";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { IPolicy } from "../contracts/IPolicy";
import type { IClock } from "../contracts/runtime/IClock";
import type { TaskInput } from "./TaskInput";
import type { AgentTaskAssignment } from "./AgentTaskAssignment";
import type { IAgentTaskFactory } from "./IAgentTaskFactory";
import { TaskInputContract } from "./TaskInputContract";
import { AgentTaskExecutor } from "./AgentTaskExecutor";
import { ValidatedExecutor } from "./ValidatedExecutor";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class StructuredTaskExecutor<TResult> implements IExecutor<TaskInput,TResult> {
  private readonly checked: ValidatedExecutor<TaskInput,TResult>;
  constructor(input: TaskInputContract, result: IResultContract<TResult>, policy: IPolicy<TaskInput,AgentTaskAssignment>, factory: IAgentTaskFactory<TResult>, json: JsonValueContract, clock: IClock) {
    this.checked = new ValidatedExecutor(input,new ExecutionOutcomeContract(result,json),new AgentTaskExecutor("structured",policy,factory,clock),json,clock);
  }
  execute(input: TaskInput, context: IExecutionContext): Promise<ExecutionOutcome<TResult>> { return this.checked.execute(input,context); }
}
```

### `executors/VerificationInput.ts`

Requests named registered checks against one immutable source snapshot. It accepts no shell command, arbitrary executable path, environment or caller-selected workspace root.

```typescript
export type VerificationInput = Readonly<{ snapshotRef: string; checkIds: readonly string[] }>;
```

### `executors/VerificationInputContract.ts`

Validates a nonempty unique bounded check list and an identified source snapshot before any tool dispatch.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { VerificationInput } from "./VerificationInput";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class VerificationInputContract implements IResultContract<VerificationInput> {
  readonly id = "verification-input"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<VerificationInput>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (row === null ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.keys(row).length !== 2 ||
        typeof row.snapshotRef !== "string" ||
        !row.snapshotRef ||
        row.snapshotRef.length > 256 ||
        !Array.isArray(row.checkIds) ||
        row.checkIds.length < 1 ||
        row.checkIds.length > 8 ||
        row.checkIds.some(id => typeof id !== "string" ||
        !/^[A-Za-z0-9_.:-]{1,128}$/.test(id)) ||
        new Set(row.checkIds).size !== row.checkIds.length) return { valid: false, issues: [{path: [],code: "INVALID_VERIFICATION_INPUT",message: "Verification input is invalid."}] };
    return { valid: true, value: checked.value as unknown as VerificationInput };
  }
}
```

### `executors/VerificationCheckResult.ts`

Identifies an actual completed check, its exact source snapshot, saved evidence and pass/fail status. A receipt must be independently verified before use.

```typescript
export type VerificationCheckResult = Readonly<{ checkId: string; checkVersion: string; snapshotRef: string; status: "passed" | "failed"; receiptRef: string; summary: string }>;
```

### `executors/VerificationCheckResultContract.ts`

Checks bounded receipt shape. Matching strings or a tool response alone do not prove that a real process ran against the cited snapshot.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { VerificationCheckResult } from "./VerificationCheckResult";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class VerificationCheckResultContract implements IResultContract<VerificationCheckResult> {
  readonly id = "verification-check-result"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<VerificationCheckResult>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (row === null ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.keys(row).length !== 6 ||
        !["checkId","checkVersion","snapshotRef","status","receiptRef","summary"].every(key => Object.prototype.hasOwnProperty.call(row,key)) ||
        typeof row.checkId !== "string" ||
        !/^[A-Za-z0-9_.:-]{1,128}$/.test(row.checkId) ||
        typeof row.checkVersion !== "string" ||
        !/^[A-Za-z0-9_.:-]{1,128}$/.test(row.checkVersion) ||
        !this.text(row.snapshotRef,256) ||
        !["passed","failed"].includes(row.status as string) ||
        !this.text(row.receiptRef,256) ||
        !this.text(row.summary,1024)) return {valid: false,issues: [{path: [],code: "INVALID_VERIFICATION_CHECK_RESULT",message: "Verification check result is invalid."}]};
    return { valid: true, value: checked.value as unknown as VerificationCheckResult };
  }
  private text(value: unknown,max: number): boolean { return typeof value === "string" && value.trim().length > 0 && value.length <= max; }
}
```

### `executors/VerificationResult.ts`

Summarizes all requested completed checks. A completed executor outcome can legitimately contain passed:false when checks ran and found a problem.

```typescript
import type { VerificationCheckResult } from "./VerificationCheckResult";
export type VerificationResult = Readonly<{ snapshotRef: string; passed: boolean; checks: readonly VerificationCheckResult[] }>;
```

### `executors/VerificationResultContract.ts`

Requires unique check IDs, matching snapshot bindings, and a passed flag equal to every receipt passing. It does not turn unverified receipts into evidence.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { VerificationResult } from "./VerificationResult";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { VerificationCheckResultContract } from "./VerificationCheckResultContract";
export class VerificationResultContract implements IResultContract<VerificationResult> {
  readonly id = "verification-result"; readonly version = "1";
  constructor(private readonly json: JsonValueContract, private readonly receipts: VerificationCheckResultContract) {}
  async validate(raw: unknown): Promise<ValidationResult<VerificationResult>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (row === null ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.keys(row).length !== 3 ||
        typeof row.snapshotRef !== "string" ||
        !row.snapshotRef ||
        row.snapshotRef.length > 256 ||
        typeof row.passed !== "boolean" ||
        !Array.isArray(row.checks) ||
        row.checks.length < 1 ||
        row.checks.length > 8) return this.invalid();
    const values = [];
    for (const rawReceipt of row.checks) { const receipt = await this.receipts.validate(rawReceipt); if (!receipt.valid ||
        receipt.value.snapshotRef !== row.snapshotRef) return this.invalid(); values.push(receipt.value); }
    if (new Set(values.map(value => value.checkId)).size !== values.length || row.passed !== values.every(value => value.status === "passed")) return this.invalid();
    return { valid: true, value: Object.freeze({ snapshotRef: row.snapshotRef, passed: row.passed, checks: Object.freeze(values) }) };
  }
  private invalid(): ValidationResult<never> { return {valid: false,issues: [{path: [],code: "INVALID_VERIFICATION_RESULT",message: "Verification result is invalid."}]}; }
}
```

### `executors/VerificationCheckRegistration.ts`

Maps a trusted check name to a registered tool and pinned tool version. Arguments remain the check/version/snapshot triple; the executor never constructs shell commands.

```typescript
export type VerificationCheckRegistration = Readonly<{ checkId: string; checkVersion: string; toolId: string; toolVersion: string }>;
```

### `executors/IVerificationReceiptVerifier.ts`

Requires the scoped evidence reader to verify saved receipt integrity, producer/check identity, actual executed check configuration, output/exit status and source snapshot. It is a deterministic trusted capability, not an LLM judging whether a claim sounds credible.

```typescript
import type { VerificationCheckResult } from "./VerificationCheckResult";
import type { IExecutionContext } from "./contracts/IExecutionContext";
export interface IVerificationReceiptVerifier { verify(receipt: VerificationCheckResult, context: IExecutionContext): Promise<boolean>; }
```

### `executors/VerificationExecutor.ts`

Dispatches pre-registered check tools sequentially through the existing authorized/budgeted tool runtime. It only reports completed check evidence after independent receipt verification; unavailable or uncertain checks remain explicit incomplete outcomes.

```typescript
import type { IExecutor } from "./contracts/IExecutor";
import type { IExecutionContext } from "./contracts/IExecutionContext";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason";
import type { IClock } from "../contracts/runtime/IClock";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import type { ToolDispatcher } from "../tools/ToolDispatcher";
import type { VerificationCheckRegistration } from "./VerificationCheckRegistration";
import type { IVerificationReceiptVerifier } from "./IVerificationReceiptVerifier";
import type { VerificationInput } from "./VerificationInput";
import type { VerificationResult } from "./VerificationResult";
import type { VerificationCheckResult } from "./VerificationCheckResult";
import { VerificationInputContract } from "./VerificationInputContract";
import { VerificationCheckResultContract } from "./VerificationCheckResultContract";
import { VerificationResultContract } from "./VerificationResultContract";
import { ValidatedExecutor } from "./ValidatedExecutor";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ExecutorContractError } from "../errors/ExecutorContractError";
export class VerificationExecutor implements IExecutor<VerificationInput,VerificationResult> {
  private readonly checks = new Map<string,VerificationCheckRegistration>();
  private readonly checked: ValidatedExecutor<VerificationInput,VerificationResult>;
  constructor(registrations: readonly VerificationCheckRegistration[],
    private readonly tools: Pick<ToolDispatcher,"dispatch">,
    private readonly verifier: IVerificationReceiptVerifier,
    private readonly receipts: VerificationCheckResultContract, input: VerificationInputContract, result: VerificationResultContract, json: JsonValueContract,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock) {
    if (registrations.length > 32) throw new ExecutorContractError();
    for (const registration of registrations) {
      if (![registration.checkId,registration.checkVersion,registration.toolId,registration.toolVersion].every(value => /^[A-Za-z0-9_.:-]{1,128}$/.test(value)) ||
        this.checks.has(registration.checkId)) throw new ExecutorContractError();
      this.checks.set(registration.checkId,Object.freeze({...registration}));
    }
    this.checked = new ValidatedExecutor(input,new ExecutionOutcomeContract(result,json),{execute: (value,context) => this.run(value,context)},json,clock);
  }
  execute(input: VerificationInput, context: IExecutionContext): Promise<ExecutionOutcome<VerificationResult>> { return this.checked.execute(input,context); }
  private async run(input: VerificationInput, context: IExecutionContext): Promise<ExecutionOutcome<VerificationResult>> {
    if (input.checkIds.some(id => !this.checks.has(id))) return { status: "failed", error: { code: "CHECK_NOT_REGISTERED", message: "Requested verification check is not registered." }, partial: { summary: "No verification checks started.", evidenceRefs: [], artifactRefs: [], unresolved: [...input.checkIds] }, pendingOperationRefs: [] };
    const saved: VerificationCheckResult[] = [];
    const guard = new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);
    for (const checkId of input.checkIds) {
      const stop = guard.check(); if (stop !== null) return this.stopped(stop,saved,input);
      const registration = this.checks.get(checkId)!;
      const operationId = this.ids.nextId();
      const child: IExecutionContext = Object.freeze({ ...context, identity: Object.freeze({...context.identity,operationId,parentOperationId:context.identity.operationId}) });
      const dispatched = await this.tools.dispatch({operationId,toolId:registration.toolId,arguments:{checkId,checkVersion:registration.checkVersion,snapshotRef:input.snapshotRef}},child);
      if (dispatched.status === "uncertain") return this.stopped({code:"no-progress",message:"Verification operation requires reconciliation."},saved,input,[dispatched.operationId]);
      if (dispatched.status === "stopped") return this.stopped(dispatched.reason,saved,input);
      if (dispatched.status === "rejected") return {status:"failed",error:{code:"VERIFICATION_TOOL_REJECTED",message:"Verification check could not start."},partial:this.partial(saved,input),pendingOperationRefs:[]};
      const receipt = await this.receipts.validate(dispatched.observation.value);
      if (dispatched.observation.operationId !== operationId ||
        dispatched.observation.toolId !== registration.toolId ||
        dispatched.observation.toolVersion !== registration.toolVersion ||
        !receipt.valid ||
        receipt.value.checkId !== checkId ||
        receipt.value.checkVersion !== registration.checkVersion ||
        receipt.value.snapshotRef !== input.snapshotRef ||
        !await this.verifier.verify(receipt.value,child)) return this.stopped({code:"no-progress",message:"Verification evidence cannot be verified."},saved,input,[operationId]);
      saved.push(receipt.value);
      const after = guard.check(); if (after !== null) return this.stopped(after,saved,input);
    }
    return { status:"completed",result:Object.freeze({snapshotRef:input.snapshotRef,passed:saved.every(receipt => receipt.status === "passed"),checks:Object.freeze(saved)}) };
  }
  private partial(saved: readonly VerificationCheckResult[], input: VerificationInput): import("../contracts/outcomes/PartialProgress").PartialProgress { return {summary:saved.map(receipt => receipt.checkId + ": " + receipt.status).join("; "),evidenceRefs:[...new Set(saved.map(receipt => receipt.receiptRef))],artifactRefs:[],unresolved:[...saved.filter(receipt => receipt.status === "failed").map(receipt => "Check failed: " + receipt.checkId),...input.checkIds.filter(id => !saved.some(receipt => receipt.checkId === id)).map(id => "Check incomplete: " + id)]}; }
  private stopped(reason: ExecutionStopReason, saved: readonly VerificationCheckResult[], input: VerificationInput, pending: readonly string[] = []): ExecutionOutcome<VerificationResult> { return {status:"stopped",reason,partial:this.partial(saved,input),pendingOperationRefs:pending}; }
}
```

### `executors/ExecutorMetadata.ts`

Pins executor registration and input/result contract identities for persisted definitions. Replacing a version in place is forbidden; recovery resolves the exact saved pair.

```typescript
export type ExecutorMetadata = Readonly<{ id: string; version: string; inputContractId: string; inputContractVersion: string; resultContractId: string; resultContractVersion: string }>;
```

### `executors/contracts/IExecutorRegistration.ts`

Provides a validated runtime entry point for heterogeneous executors. unknown input forces runtime validation; returned completed values are finite JSON for workflow persistence.

```typescript
import type { IExecutor } from "./IExecutor";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { ExecutorMetadata } from "../ExecutorMetadata";
export interface IExecutorRegistration extends IExecutor<unknown,JsonValue> { readonly metadata: ExecutorMetadata; }
```

### `executors/ExecutorRegistration.ts`

Adapts a typed executor into a JSON-safe versioned registration without an unchecked cast at the registry boundary. Pure contracts are checked before/after dispatch; no validation step executes a model or tool.

```typescript
import type { IExecutorRegistration } from "./contracts/IExecutorRegistration";
import type { IExecutor } from "./contracts/IExecutor";
import type { IExecutionContext } from "./contracts/IExecutionContext";
import type { ExecutorMetadata } from "./ExecutorMetadata";
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { IClock } from "../contracts/runtime/IClock";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ValidatedExecutor } from "./ValidatedExecutor";
import { ExecutorContractError } from "../errors/ExecutorContractError";
export class ExecutorRegistration<TInput,TResult> implements IExecutorRegistration {
  readonly metadata: ExecutorMetadata;
  private readonly checked: ValidatedExecutor<TInput,TResult>;
  constructor(id: string, version: string, input: IResultContract<TInput>, result: IResultContract<TResult>, executor: IExecutor<TInput,TResult>,
    private readonly json: JsonValueContract, clock: IClock) {
    if (![id,version,input.id,input.version,result.id,result.version].every(value => /^[A-Za-z0-9_.:-]{1,128}$/.test(value))) throw new ExecutorContractError();
    this.metadata = Object.freeze({id,version,inputContractId:input.id,inputContractVersion:input.version,resultContractId:result.id,resultContractVersion:result.version});
    this.checked = new ValidatedExecutor(input,new ExecutionOutcomeContract(result,json),executor,json,clock);
  }
  async execute(raw: unknown, context: IExecutionContext): Promise<ExecutionOutcome<JsonValue>> {
    const outcome = await this.checked.execute(raw as TInput,context);
    const copy = await this.json.validate(outcome); if (!copy.valid) throw new ExecutorContractError();
    return copy.value as unknown as ExecutionOutcome<JsonValue>;
  }
}
```

### `executors/ExecutorRegistry.ts`

Resolves exact registered executor/version pairs through a Map. The future StepRunner uses this shared entry point and does not branch on executor names or implementations.

```typescript
import type { IExecutorRegistration } from "./contracts/IExecutorRegistration";
import { ExecutorContractError } from "../errors/ExecutorContractError";
import { UnknownRegistrationError } from "../errors/UnknownRegistrationError";
export class ExecutorRegistry {
  private readonly registrations = new Map<string,IExecutorRegistration>();
  register(registration: IExecutorRegistration): void {
    const metadata = registration.metadata;
    if (![metadata.id,metadata.version,metadata.inputContractId,metadata.inputContractVersion,metadata.resultContractId,metadata.resultContractVersion].every(value => /^[A-Za-z0-9_.:-]{1,128}$/.test(value)) ||
        this.registrations.size >= 128) throw new ExecutorContractError();
    const key = this.key(metadata.id,metadata.version); if (this.registrations.has(key)) throw new ExecutorContractError();
    this.registrations.set(key,Object.freeze({metadata:Object.freeze({...metadata}),execute:registration.execute.bind(registration)}));
  }
  resolve(id: string, version: string): IExecutorRegistration { if (![id,version].every(value => /^[A-Za-z0-9_.:-]{1,128}$/.test(value))) throw new ExecutorContractError(); const value = this.registrations.get(this.key(id,version)); if (value === undefined) throw new UnknownRegistrationError(id + "@" + version); return value; }
  list(): readonly import("./ExecutorMetadata").ExecutorMetadata[] { return Object.freeze([...this.registrations.values()].map(value => value.metadata)); }
  private key(id: string, version: string): string { return JSON.stringify([id,version]); }
}
```

### `examples/executors/LoginSpecificationResult.ts`

Shows an application-specific result shape for StructuredTaskExecutor. The reusable executor does not need a new subclass for a login specification.

```typescript
export type LoginSpecificationResult = Readonly<{ summary: string; requirements: readonly string[]; acceptanceCriteria: readonly string[]; sourceRefs: readonly string[]; unresolved: readonly string[] }>;
```

### `examples/executors/LoginSpecificationContract.ts`

Validates the example specification shape through public framework APIs. Source truth and requirement completeness remain independent acceptance checks.

```typescript
import type { IResultContract, ValidationResult } from "../../index";
import { JsonValueContract } from "../../index";
import type { LoginSpecificationResult } from "./LoginSpecificationResult";
export class LoginSpecificationContract implements IResultContract<LoginSpecificationResult> {
  readonly id = "login-specification"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<LoginSpecificationResult>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (row === null ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.keys(row).length !== 5 ||
        !["summary","requirements","acceptanceCriteria","sourceRefs","unresolved"].every(key => Object.prototype.hasOwnProperty.call(row,key)) ||
        typeof row.summary !== "string" ||
        !row.summary.trim() ||
        row.summary.length > 2048 ||
        !this.list(row.requirements,16,512) ||
        row.requirements.length < 1 ||
        !this.list(row.acceptanceCriteria,16,512) ||
        row.acceptanceCriteria.length < 1 ||
        !this.list(row.sourceRefs,16,256) ||
        !this.list(row.unresolved,16,512)) return {valid:false,issues:[{path:[],code:"INVALID_LOGIN_SPECIFICATION",message:"Login specification is invalid."}]};
    return {valid:true,value:checked.value as unknown as LoginSpecificationResult};
  }
  private list(value: unknown,max: number,length: number): value is readonly string[] { return Array.isArray(value) && value.length <= max && value.every(item => typeof item === "string" && item.trim().length > 0 && item.length <= length) && new Set(value).size === value.length; }
}
```

### `examples/executors/LoginExecutorsExample.ts`

Assembles all four registrations through the public API. Host-supplied factories enforce real mode/session permissions; the supplied verification executor must be configured with actual registered check tools and a receipt verifier.

```typescript
import type { IAgentTaskFactory, IClock, InvestigationResult, EditingResult } from "../../index";
import { JsonValueContract, TaskInputContract, InvestigationResultContract, EditingResultContract, VerificationInputContract, VerificationCheckResultContract, VerificationResultContract, WorkspaceInvestigationExecutor, StructuredTaskExecutor, WorkspaceEditingExecutor, VerificationExecutor, DefaultAgentAssignmentPolicy, ExecutorRegistration, ExecutorRegistry } from "../../index";
import type { LoginSpecificationResult } from "./LoginSpecificationResult";
import { LoginSpecificationContract } from "./LoginSpecificationContract";
export class LoginExecutorsExample {
  constructor(private readonly investigation: IAgentTaskFactory<InvestigationResult>,
    private readonly specification: IAgentTaskFactory<LoginSpecificationResult>,
    private readonly editing: IAgentTaskFactory<EditingResult>,
    private readonly verification: VerificationExecutor,
    private readonly clock: IClock) {}
  createRegistry(): ExecutorRegistry {
    const json = new JsonValueContract(), task = new TaskInputContract(json);
    const findings = new InvestigationResultContract(json), specification = new LoginSpecificationContract(json), changes = new EditingResultContract(json);
    const investigate = new WorkspaceInvestigationExecutor(task,findings,new DefaultAgentAssignmentPolicy("Inspect permitted login source and cite verified evidence. Do not change files."),this.investigation,json,this.clock);
    const specify = new StructuredTaskExecutor(task,specification,new DefaultAgentAssignmentPolicy("Prepare a source-backed login specification; preserve password login and require expiry validation."),this.specification,json,this.clock);
    const edit = new WorkspaceEditingExecutor(task,changes,new DefaultAgentAssignmentPolicy("Implement only the accepted specification in the permitted working copy; retain change/check references."),this.editing,json,this.clock);
    const verificationInput = new VerificationInputContract(json), verificationResult = new VerificationResultContract(json,new VerificationCheckResultContract(json));
    const registry = new ExecutorRegistry();
    registry.register(new ExecutorRegistration("workspace-investigation","1",task,findings,investigate,json,this.clock));
    registry.register(new ExecutorRegistration("login-specification","1",task,specification,specify,json,this.clock));
    registry.register(new ExecutorRegistration("workspace-editing","1",task,changes,edit,json,this.clock));
    registry.register(new ExecutorRegistration("verification","1",verificationInput,verificationResult,this.verification,json,this.clock));
    return registry;
  }
}
```

### `executors/IVerificationTargetResolver.ts`

Resolves an authorized immutable source snapshot to the existing GuardTarget used by saved check receipts. Matching a snapshot string alone is not target verification.

```typescript
import type { GuardTarget } from "../guards/GuardTarget";
import type { IExecutionContext } from "./contracts/IExecutionContext";
export interface IVerificationTargetResolver { resolve(snapshotRef: string, context: IExecutionContext): Promise<GuardTarget | null>; }
```

### `executors/RecordedVerificationReceiptVerifier.ts`

Reuses the existing page-15 VerificationReceipt and reader rather than defining another saved receipt format. It verifies the scoped target and derives pass/fail from the recorded exit code; it never runs a check itself.

```typescript
import type { IVerificationReceiptVerifier } from "./IVerificationReceiptVerifier";
import type { IVerificationTargetResolver } from "./IVerificationTargetResolver";
import type { VerificationCheckResult } from "./VerificationCheckResult";
import type { IVerificationReceiptReader } from "../guards/checks/IVerificationReceiptReader";
import type { IGuardTargetVerifier } from "../guards/IGuardTargetVerifier";
import type { IExecutionContext } from "./contracts/IExecutionContext";
export class RecordedVerificationReceiptVerifier implements IVerificationReceiptVerifier {
  constructor(private readonly targets: IVerificationTargetResolver, private readonly verifier: IGuardTargetVerifier, private readonly receipts: IVerificationReceiptReader) {}
  async verify(result: VerificationCheckResult, context: IExecutionContext): Promise<boolean> {
    const target = await this.targets.resolve(result.snapshotRef,context);
    if (target === null || target.workspaceId !== context.scope.workspaceId || !await this.verifier.verify(target,context)) return false;
    const receipt = await this.receipts.read(result.receiptRef,target,context);
    return receipt !== null && receipt.checkId === result.checkId && receipt.checkVersion === result.checkVersion && receipt.revisionRef === target.revisionRef && Number.isSafeInteger(receipt.exitCode) && receipt.exitCode >= 0 && receipt.exitCode <= 255 && typeof receipt.evidenceRef === "string" && receipt.evidenceRef.length > 0 && receipt.evidenceRef.length <= 256 && result.status === (receipt.exitCode === 0 ? "passed" : "failed");
  }
}
```

### `index.ts`

Append the supported executor/result/registry and assembly contracts while retaining previous exports. Internal AgentTaskExecutor and application examples remain private.

```typescript
export { ExecutorContractError } from "./errors/ExecutorContractError";
export type { TaskInput } from "./executors/TaskInput";
export { TaskInputContract } from "./executors/TaskInputContract";
export { ExecutionOutcomeContract } from "./contracts/validation/ExecutionOutcomeContract";
export { ValidatedExecutor } from "./executors/ValidatedExecutor";
export type { AgentTaskMode } from "./executors/AgentTaskMode";
export type { AgentTaskAssignment } from "./executors/AgentTaskAssignment";
export type { AgentTaskBindingRequest } from "./executors/AgentTaskBindingRequest";
export { DefaultAgentAssignmentPolicy } from "./executors/DefaultAgentAssignmentPolicy";
export type { AgentTaskBinding } from "./executors/AgentTaskBinding";
export type { IAgentTaskFactory } from "./executors/IAgentTaskFactory";
export type { IAgentTaskSessionProvider } from "./executors/IAgentTaskSessionProvider";
export { SessionAgentTaskFactory } from "./executors/SessionAgentTaskFactory";
export type { InvestigationResult } from "./executors/InvestigationResult";
export { InvestigationResultContract } from "./executors/InvestigationResultContract";
export type { EditingResult } from "./executors/EditingResult";
export { EditingResultContract } from "./executors/EditingResultContract";
export { WorkspaceInvestigationExecutor } from "./executors/WorkspaceInvestigationExecutor";
export { WorkspaceEditingExecutor } from "./executors/WorkspaceEditingExecutor";
export { StructuredTaskExecutor } from "./executors/StructuredTaskExecutor";
export type { VerificationInput } from "./executors/VerificationInput";
export { VerificationInputContract } from "./executors/VerificationInputContract";
export type { VerificationCheckResult } from "./executors/VerificationCheckResult";
export { VerificationCheckResultContract } from "./executors/VerificationCheckResultContract";
export type { VerificationResult } from "./executors/VerificationResult";
export { VerificationResultContract } from "./executors/VerificationResultContract";
export type { VerificationCheckRegistration } from "./executors/VerificationCheckRegistration";
export type { IVerificationReceiptVerifier } from "./executors/IVerificationReceiptVerifier";
export { VerificationExecutor } from "./executors/VerificationExecutor";
export type { ExecutorMetadata } from "./executors/ExecutorMetadata";
export type { IExecutorRegistration } from "./executors/contracts/IExecutorRegistration";
export { ExecutorRegistration } from "./executors/ExecutorRegistration";
export { ExecutorRegistry } from "./executors/ExecutorRegistry";
export type { IVerificationTargetResolver } from "./executors/IVerificationTargetResolver";
export { RecordedVerificationReceiptVerifier } from "./executors/RecordedVerificationReceiptVerifier";
```
