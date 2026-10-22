# 20. Sub-Agents and Parent–Child Coordination

## What We Implement Here

Create the optional spawn-sub-agent tool, trusted permission narrowing, registered child AgenticMindUnit construction, and durable parent–child admission/result records. Give every child a separate session and a bounded assignment while sharing the original run budget. Execute children sequentially by default, preserve partial or uncertain work, and return the recorded outcome to the parent. Add SQLite/PostgreSQL journal statements and a concrete login.ts example; application-owned child session assembly and full recovery remain explicit integration work.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `agentic/subagents/SubAgentRequest.ts` | `type SubAgentRequest` |
| `agentic/subagents/SubAgentAuthority.ts` | `type SubAgentAuthority` |
| `agentic/subagents/AdmittedSubAgent.ts` | `type AdmittedSubAgent` |
| `agentic/subagents/SubAgentOutcome.ts` | `type SubAgentOutcome` |
| `agentic/subagents/SubAgentPolicyInput.ts` | `type SubAgentPolicyInput` |
| `agentic/subagents/SubAgentPolicyDecision.ts` | `type SubAgentPolicyDecision` |
| `agentic/subagents/BoundedSubAgentPolicy.ts` | `class BoundedSubAgentPolicy implements IPolicy<SubAgentPolicyInput, SubAgentPolicyDecision>` |
| `errors/SubAgentCoordinationError.ts` | `class SubAgentCoordinationError extends Error` |
| `agentic/subagents/SubAgentRequestContract.ts` | `class SubAgentRequestContract implements IResultContract<SubAgentRequest>` |
| `agentic/subagents/ChildOutcomeContract.ts` | `class ChildOutcomeContract implements IResultContract<ExecutionOutcome<JsonValue>>` |
| `agentic/subagents/SubAgentClaim.ts` | `type SubAgentClaim` |
| `agentic/subagents/SubAgentClaimOutcome.ts` | `type SubAgentClaimOutcome` |
| `agentic/subagents/ISubAgentJournal.ts` | `interface ISubAgentJournal` |
| `agentic/subagents/ChildAgentBinding.ts` | `type ChildAgentBinding` |
| `agentic/subagents/IAgenticUnitFactory.ts` | `interface IAgenticUnitFactory` |
| `agentic/subagents/IChildAgentBuilder.ts` | `interface IChildAgentBuilder` |
| `agentic/subagents/RegisteredAgenticUnitFactory.ts` | `class RegisteredAgenticUnitFactory implements IAgenticUnitFactory` |
| `agentic/subagents/SubAgentCoordinator.ts` | `class SubAgentCoordinator` |
| `agentic/subagents/SubAgentRecord.ts` | `type SubAgentRecord` |
| `agentic/subagents/SubAgentRunSnapshot.ts` | `type SubAgentRunSnapshot` |
| `agentic/subagents/createSubAgentCommandKey.ts` | `function createSubAgentCommandKey` |
| `agentic/subagents/SubAgentState.ts` | `class SubAgentState` |
| `agentic/subagents/SubAgentRunSnapshotContract.ts` | `class SubAgentRunSnapshotContract implements IResultContract<SubAgentRunSnapshot>` |
| `agentic/subagents/SubAgentJournalStatements.ts` | `type SubAgentJournalStatements` |
| `agentic/subagents/sqliteSubAgentJournalStatements.ts` | `const sqliteSubAgentJournalStatements` |
| `agentic/subagents/postgresqlSubAgentJournalStatements.ts` | `const postgresqlSubAgentJournalStatements` |
| `agentic/subagents/SqlSubAgentJournal.ts` | `class SqlSubAgentJournal implements ISubAgentJournal` |
| `agentic/subagents/IChildSessionFactoryProvider.ts` | `interface IChildSessionFactoryProvider` |
| `agentic/subagents/SessionChildAgentBuilder.ts` | `class SessionChildAgentBuilder implements IChildAgentBuilder` |
| `agentic/subagents/subAgentRequestSchema.ts` | `const subAgentRequestSchema` |
| `agentic/subagents/SubAgentArgumentsContract.ts` | `class SubAgentArgumentsContract implements IResultContract<JsonValue>` |
| `agentic/subagents/SpawnSubAgentTool.ts` | `class SpawnSubAgentTool implements ITool` |
| `examples/subagents/LoginSubAgentExample.ts` | `class LoginSubAgentExample` |
| `tests/subagents/MemorySubAgentJournal.ts` | `class MemorySubAgentJournal implements ISubAgentJournal` |
| `examples/subagents/createSubAgentJournalExample.ts` | `function createSubAgentJournalExample` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [page 01](01-scope-and-implementation-roadmap.md) and [page 02](02-package-structure-and-oop-conventions.md) for general OOP, naming and writing rules. Each class/interface has its own file; interface names begin with `I`. Reuse shared `IPolicy`, `IExecutor`, result contracts, model routing, tool dispatch, context composition, budgets, workspaces and session runtime. These are specification snippets for future KushiBot source files, not an implementation installed by editing this note.
- A sub-agent is a separate page-19 AgenticMindUnit session with its own conversation, notebook, scoped tools and accepted result. It is not a second prompt added to the parent conversation. The parent receives a result/partial/pending observation and must still satisfy its own acceptance criteria. A child's completion cannot directly mark the parent's assignment completed, publish changes, or manufacture user approval.
- The only public model capability is the registered `spawn-sub-agent` tool, routed through page 13. Include it only in authorized parent registries and allowlists. The current gateway uses page-19 text JSON actions, for example `{"kind":"tool","toolId":"spawn-sub-agent","arguments":{...}}`; this page adds no native provider tool-call protocol. A spawn consumes the parent's ordinary tool-call allowance and its model request already consumed the parent's model allowance. Each child's model/tool/iteration usage is separately charged to its child scope in the same run ledger.
- Model input supplies only a focused goal, criteria, source references, registered role/contract names, requested tools, exact file paths and narrower limits. Identity, run/project/workspace, lineage, root caps and executable builders come from the host. Request `sourceRefs` are untrusted locators: the child context source authorizes and verifies them before use. No executable schemas, arbitrary filesystem roots, raw provider selection, hidden tool installation or prompt-supplied permissions.
- `SubAgentAuthority` is a trusted binding per parent session, copied at coordinator construction. The factory derives a child's authority from inherited constraints and the admitted request; a child may receive `spawn-sub-agent` only if the parent had it and the child explicitly requested it. Depth/count enforcement is independent of that tool's presence. Read-only parents cannot gain editing powers through children. Child paths and tool IDs must be subsets of the parent authority. Limits cannot exceed parent ceilings; actual remaining allowance is still enforced on every operation by the shared ledger.
- `SessionChildAgentBuilder` constructs the actual AgenticMindUnit; `IChildSessionFactoryProvider` remains an application composition seam. Its implementation must create fresh page-19 session dependencies, bind the admitted goal/criteria/scope, pick a genuinely eligible pinned model via page 12, restrict read/edit tools to the exact requested paths, install the registered result/acceptance contracts and all inherited mandatory guard requirements regardless of the model-proposed child criteria, set maxTurns and the child budget scope, preserve the abort signal and the smaller deadline, and bind the child session journal. Registering a string or matching result-contract ID does not itself enforce those capabilities. No production child assembly is complete until that provider and the page-19 context/session adapters exist and pass integration checks.
- The default schedule is sequential for all children in one run. A parent awaits its child; siblings do not overlap. Nested children may execute along one active ancestor chain while ancestors await them. Atomic journal admission rejects unrelated active work with `SEQUENTIAL_CHILD_BUSY`; it does not queue or retry automatically. Parallel read-only children and isolated concurrent editors require a separate explicit scheduling implementation and are outside this phase.
- Separate sessions do not isolate files. If child A and child B both read version 1 of `src/login.ts`, A can save Google-login validation, then B can overwrite it using its stale version 1 while adding expiry logic. The default example waits for A to finish, then B starts from the current source and retains A's changes. The child context provider must capture/verify that latest revision. Page-14 editing tools still enforce exact permitted paths, CAS revisions and their workspace gate. The coordinator never holds that low-level gate around an entire child, which would deadlock tools acquiring it themselves.
- The scheduling guarantee is per scoped run. Other independent runs or external editors touching the same workspace still need the shared page-14 editing gate/CAS or an isolated workspace. Trusted host code must not edit concurrently with its awaited child. This phase does not provide OS-process isolation, a Git branch/worktree per child, cross-run workflow scheduling, arbitrary native-file access or automatic merge/conflict resolution.
- `SubAgentState` is the deterministic owner of total child count, nesting, lineage and active-chain rules. The journal retains every admitted child, including cancelled, failed and pending attempts, so restart or completion cannot reset maxChildren. Root is depth 0, first child depth 1; configured maximums are 64 total children and depth 8. A maxChildren/maxDepth value of zero disables admission. All descendants share these root limits. The same admitted child cannot be dispatched twice by reusing a command.
- `SqlSubAgentJournal.initialize` runs during trusted startup with an empty initial record list, a fixed root binding and configured caps. Use `JsonRecordCodec<SubAgentRunSnapshot>` with `SubAgentRunSnapshotContract`, the existing finite-JSON contract and a 524288-byte limit. The JSON contract's node/depth bounds remain in force too: a large accumulated journal can reach its storage bound before the child-count cap. Such a required storage failure is observable and must not start a child whose admission was not committed. Retain/recover records through explicit retention/recovery work; never drop receipts to bypass admission limits.
- SQLite and PostgreSQL statement sets use the existing ISqlDatabase transaction and cross-worker migration lock contracts. A no-op row update holds a per-run write lock through decode/validate/mutate/encode/update; normalized affectedRows must be 1. Provider/model/tool/policy execution never occurs under that lock. Restart uses `ON CONFLICT DO NOTHING`, validates the saved binding, and preserves existing records. Never silently replace saved caps, scope, root session or consumption. Version changes require explicit migrations.
- The canonical command key binds the parent session/lineage/budget, fixed scope fields and the validated effective request. It is bounded private persisted data, not a security token or safe log field. Redelivery must reuse the same parent tool-operation ID. Exact replay returns the stored outcome or a pending reference; conflicting content under that ID fails. Generating different candidate IDs on a retry does not create another child. Page-13 tool receipts provide an additional delivery boundary; neither layer permits replaying an uncertain effect.
- Journal admission commits before child budget-scope creation and execution. Budget and child/session/tool journals are separate transactions, not one distributed transaction. A crash between them leaves a conservative pending admission; it cannot be taken over merely because time elapsed. Adding a child scope does not reserve its entire ceiling or grant fresh run allowance: every actual operation reserves against child and ancestors. Do not sum child totals into the parent again. No hidden retry, fallback inference, reset ledger, automatic reconciliation or free closing call is introduced.
- Abort and deadline use inherited controls. A child may shorten its deadline; it cannot extend the parent's. The coordinator rechecks controls after asynchronous admission policy and before execution. The page-19 unit checks again at its own boundaries. Expiry after admission can produce a stopped, never-started child outcome; once work began, cancellation does not prove an underlying provider or editing tool stopped. Never release unresolved scheduling/effect claims because the awaiting caller timed out.
- A null journal outcome is pending. A recorded stopped/failed outcome with pending operation references remains open for scheduling. Saved completed or stopped/failed outcomes without pending references close the claim. A parent cannot complete while a descendant is unresolved; it may only preserve an explicit pending partial outcome. Full effect/usage reconciliation, safe checkpoint restoration and closing an uncertain claim belong to page 24; this phase deliberately provides no automatic takeover/release API.
- The page-19 context provider must use the journal’s scoped `read()` snapshot as well as ordinary tool receipts. This is a trusted runtime capability: select only the authorized parent/child records and do not expose the whole run journal as raw child context. A `pending` child response or a child's pending references must enter authoritative parent pending state before its next model call/acceptance check. The spawn tool returning a transport observation is not evidence that the child's effects finished. Parent acceptance checks the journal, source/check receipts and unresolved descendants, not an optimistic model summary. Record-return replay still requires ordinary scoped authorization and provenance checks before its content can become evidence.
- Every returned child envelope passes `ChildOutcomeContract`; completed values also pass the registered result contract. The child session supplies independent acceptance, so schema validity alone is not task success. Stopped results keep their summary/evidence/artifact refs/unresolved fields and pending list unchanged. A failed child remains failed. A malformed envelope or thrown child execution yields conservative pending work, not a fabricated successful result or an automatic rerun. Required factory, budget, journal and codec failures remain observable; do not turn them into completed output. `complete` commits before the coordinator reports a returned result.
- Parent use of partial work is concrete: an investigation child reads login.ts, finds session creation, then reaches its two-iteration limit before checking expiry. Its returned `stopped` outcome can contain that verified finding and the saved source reference, with “Expiry validation not checked” in unresolved. The parent can incorporate the supported finding, keep expiry as unresolved, and choose an authorized next step under the remaining shared budget. It cannot say the login investigation or expiry checks passed. No extra summarizing model call is needed to preserve collected work.
- Optional tracing records IDs, counts, lineage, admission/result statuses, safe codes and known/unknown usage. Do not log assignment text, command-key contents, prompts, notebook content, source text, secrets or private reasoning. Required admission/usage/result persistence remains active when optional logging is disabled. Provider prompt caching continues through pages 16–17 inside each real child; stable request structure enables provider caching opportunistically and never reuses an old answer.
- Verification must cover narrowing/escalation, malformed/extra-key requests, exact paths, inherited deadline/abort, additional policy rejection, count/depth limits including nested children, busy siblings, single active ancestor chains, shared parent usage, changed command identity, pending and completed redelivery, partial delivery, malformed child output, no duplicate dispatch, required persistence failures and restart preservation. Use offline fixtures for model/child behavior, and a real SQLite driver for transaction/round-trip checks. PostgreSQL SQL parity alone is not PostgreSQL integration evidence; run that adapter's locking/concurrency suite before a production claim.

## TypeScript Code for Each File

### `agentic/subagents/SubAgentRequest.ts`

Describes a focused assignment using registered capability names and exact workspace-relative file paths. It contains no executable code, provider credentials, arbitrary filesystem root, or caller-supplied child identity.

```typescript
import type { UsageAmounts } from "../../usage/UsageAmounts";
export type SubAgentRequest = Readonly<{
  goal: string; acceptanceCriteria: readonly string[]; sourceRefs: readonly string[];
  modelRole: string; resultContractId: string; toolIds: readonly string[];
  access: "read-only" | "edit"; filePaths: readonly string[];
  maxTurns: number; limits: UsageAmounts; deadlineEpochMs: number | null;
}>;
```

### `agentic/subagents/SubAgentAuthority.ts`

Carries trusted parent permissions and lineage supplied by composition code, never by the model request. Allowed paths are exact files; an empty list grants no workspace files.

```typescript
import type { UsageAmounts } from "../../usage/UsageAmounts";
export type SubAgentAuthority = Readonly<{
  runId: string; parentSessionId: string; parentChildId: string | null;
  parentDepth: number; parentBudgetScopeId: string;
  canSpawn: boolean; canEdit: boolean; allowedToolIds: readonly string[];
  allowedModelRoles: readonly string[]; allowedResultContractIds: readonly string[];
  allowedFilePaths: readonly string[]; limits: UsageAmounts;
}>;
```

### `agentic/subagents/AdmittedSubAgent.ts`

Records immutable parent/child identity, inherited scope/deadline, the narrowed request, and the child budget link. The coordinator creates all IDs through the host generator.

```typescript
import type { SubAgentRequest } from "./SubAgentRequest";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
export type AdmittedSubAgent = Readonly<{
  childId: string; sessionId: string; operationId: string; budgetScopeId: string;
  parentSessionId: string; parentChildId: string | null; parentBudgetScopeId: string;
  depth: number; runId: string; scope: ExecutionScopeRef;
  request: SubAgentRequest;
}>;
```

### `agentic/subagents/SubAgentOutcome.ts`

Returns a recorded child outcome, an admission rejection, or an unresolved operation. A stopped child is useful partial work and remains explicitly stopped.

```typescript
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
export type SubAgentOutcome =
  | Readonly<{ status: "rejected"; code: string }>
  | Readonly<{ status: "pending"; childId: string; pendingOperationRefs: readonly string[] }>
  | Readonly<{ status: "returned"; childId: string; sessionId: string; outcome: ExecutionOutcome<JsonValue> }>;
```

### `agentic/subagents/SubAgentPolicyInput.ts`

Offers only already narrowed metadata to an additional admission policy. A policy cannot expand mandatory permissions or override journal scheduling/count/depth limits.

```typescript
import type { SubAgentRequest } from "./SubAgentRequest";
export type SubAgentPolicyInput = Readonly<{ request: SubAgentRequest; depth: number }>;
```

### `agentic/subagents/SubAgentPolicyDecision.ts`

Allows an additional restriction or an explicit rejection, without returning replacement permissions.

```typescript
export type SubAgentPolicyDecision = Readonly<{ allowed: true }> | Readonly<{ allowed: false; code: string }>;
```

### `agentic/subagents/BoundedSubAgentPolicy.ts`

Provides a deterministic optional local turn cap. Mandatory inherited capabilities and durable run-wide limits are enforced independently by the coordinator and journal.

```typescript
import type { IPolicy } from "../../contracts/IPolicy";
import type { SubAgentPolicyInput } from "./SubAgentPolicyInput";
import type { SubAgentPolicyDecision } from "./SubAgentPolicyDecision";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError";
export class BoundedSubAgentPolicy implements IPolicy<SubAgentPolicyInput, SubAgentPolicyDecision> {
  constructor(private readonly maxTurns: number) { if (!Number.isSafeInteger(maxTurns) || maxTurns < 1 || maxTurns > 128) throw new SubAgentCoordinationError(); }
  async apply(input: SubAgentPolicyInput): Promise<SubAgentPolicyDecision> { return input.request.maxTurns <= this.maxTurns ? { allowed: true } : { allowed: false, code: "CHILD_TURN_CAP" }; }
}
```

### `errors/SubAgentCoordinationError.ts`

Reports invalid trusted bindings, conflicting command identity, or required journal corruption without leaking assignment or source text.

```typescript
export class SubAgentCoordinationError extends Error {
  readonly code = "SUB_AGENT_COORDINATION_INVALID";
  constructor() { super("Sub-agent binding, journal state, or command identity is invalid."); this.name = "SubAgentCoordinationError"; }
}
```

### `agentic/subagents/SubAgentRequestContract.ts`

Strictly copies finite JSON and validates every requested field, bounded usage dimension, list and exact file path before policy or construction.

```typescript
import type { IResultContract } from "../../contracts/validation/IResultContract";
import type { ValidationResult } from "../../contracts/validation/ValidationResult";
import type { SubAgentRequest } from "./SubAgentRequest";
import { JsonValueContract } from "../../persistence/JsonValueContract";
import { usageDimensions } from "../../usage/usageDimensions";
export class SubAgentRequestContract implements IResultContract<SubAgentRequest> {
  readonly id = "sub-agent-request"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<SubAgentRequest>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 16384) return this.invalid();
    const row = checked.value as unknown as Record<string, unknown>;
    if (!this.object(row) ||
        !this.keys(row, ["goal","acceptanceCriteria","sourceRefs","modelRole","resultContractId","toolIds","access","filePaths","maxTurns","limits","deadlineEpochMs"])) return this.invalid();
    if (!this.text(row.goal, 2048) ||
        !this.list(row.acceptanceCriteria, 16, 512) ||
        (row.acceptanceCriteria as unknown[]).length < 1 ||
        !this.list(row.sourceRefs, 16, 256) ||
        !this.validId(row.modelRole) ||
        !this.validId(row.resultContractId) ||
        !this.list(row.toolIds, 16, 128) ||
        !(row.toolIds as unknown[]).every(value => this.validId(value)) ||
        !["read-only","edit"].includes(row.access as string) ||
        !this.list(row.filePaths, 16, 256) ||
        !(row.filePaths as string[]).every(path => this.path(path)) ||
        !Number.isSafeInteger(row.maxTurns) ||
        (row.maxTurns as number) < 1 ||
        (row.maxTurns as number) > 128 ||
        !this.object(row.limits) ||
        !this.keys(row.limits, usageDimensions) ||
        !usageDimensions.every(key => Number.isSafeInteger((row.limits as Record<string, unknown>)[key]) && ((row.limits as Record<string, number>)[key] >= 0) && ((row.limits as Record<string, number>)[key] <= 1000000000)) ||
        !(row.deadlineEpochMs === null ||
        (Number.isSafeInteger(row.deadlineEpochMs) && (row.deadlineEpochMs as number) >= 0))) return this.invalid();
    return { valid: true, value: checked.value as unknown as SubAgentRequest };
  }
  private object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private validId(value: unknown): boolean { return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,128}$/.test(value); }
  private text(value: unknown, max: number): boolean { return typeof value === "string" && value.trim().length > 0 && value.length <= max; }
  private list(value: unknown, max: number, length: number): boolean { return Array.isArray(value) && value.length <= max && value.every(item => this.text(item,length)) && new Set(value).size === value.length; }
  private path(value: string): boolean { return /^[A-Za-z0-9_.@/-]+$/.test(value) && !value.startsWith("/") && value.split("/").every(part => part !== "" && part !== "." && part !== ".."); }
  private invalid(): ValidationResult<never> { return { valid: false, issues: [{ path: [], code: "INVALID_SUB_AGENT_REQUEST", message: "Sub-agent request does not satisfy the bounded contract." }] }; }
}
```

### `agentic/subagents/ChildOutcomeContract.ts`

Validates bounded completed, stopped and failed child envelopes. A completed value still requires its separately registered result contract and session acceptance.

```typescript
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
import type { IResultContract } from "../../contracts/validation/IResultContract";
import type { ValidationResult } from "../../contracts/validation/ValidationResult";
import { JsonValueContract } from "../../persistence/JsonValueContract";
export class ChildOutcomeContract implements IResultContract<ExecutionOutcome<JsonValue>> {
  readonly id = "sub-agent-execution-outcome"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<ExecutionOutcome<JsonValue>>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 32768) return this.invalid();
    const row = checked.value as unknown as Record<string, unknown>;
    if (!this.object(row)) return this.invalid();
    if (row.status === "completed" && this.keys(row,["status","result"])) return { valid: true, value: checked.value as unknown as ExecutionOutcome<JsonValue> };
    if (row.status !== "stopped" && row.status !== "failed") return this.invalid();
    const reason = row.status === "stopped" ? row.reason : row.error;
    if (!this.keys(row, row.status === "stopped" ? ["status","reason","partial","pendingOperationRefs"] : ["status","error","partial","pendingOperationRefs"]) ||
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
    return { valid: true, value: checked.value as unknown as ExecutionOutcome<JsonValue> };
  }
  private object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private text(value: unknown,max: number): boolean { return typeof value === "string" && value.length > 0 && value.length <= max; }
  private list(value: unknown,max: number,length: number): boolean { return Array.isArray(value) && value.length <= max && value.every(item => this.text(item,length)) && new Set(value).size === value.length; }
  private invalid(): ValidationResult<never> { return { valid: false, issues: [{ path: [], code: "INVALID_CHILD_OUTCOME", message: "Child outcome is malformed or exceeds its bounds." }] }; }
}
```

### `agentic/subagents/SubAgentClaim.ts`

Binds a canonical request to the parent tool operation. Redelivery reuses this command key; generated child IDs are ignored when an exact saved command already exists.

```typescript
import type { AdmittedSubAgent } from "./AdmittedSubAgent";
export type SubAgentClaim = Readonly<{ commandId: string; requestKey: string; candidate: AdmittedSubAgent }>;
```

### `agentic/subagents/SubAgentClaimOutcome.ts`

Separates a newly admitted dispatch from a previously recorded result, a pending operation and a durable count/depth/scheduling rejection.

```typescript
import type { AdmittedSubAgent } from "./AdmittedSubAgent";
import type { SubAgentOutcome } from "./SubAgentOutcome";
export type SubAgentClaimOutcome = Readonly<{ status: "admitted"; child: AdmittedSubAgent }> | Readonly<{ status: "existing"; response: SubAgentOutcome }> | Readonly<{ status: "rejected"; code: string }>;
```

### `agentic/subagents/ISubAgentJournal.ts`

Requires atomic command admission, run-wide count/depth checks, sequential ancestor-chain scheduling and durable outcome delivery. Implementations reject conflicting identity and never treat pending work as dispatch permission.

```typescript
import type { SubAgentRunSnapshot } from "./SubAgentRunSnapshot";
import type { SubAgentClaim } from "./SubAgentClaim";
import type { SubAgentClaimOutcome } from "./SubAgentClaimOutcome";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
export interface ISubAgentJournal {
  read(): Promise<SubAgentRunSnapshot>;
  claim(input: SubAgentClaim): Promise<SubAgentClaimOutcome>;
  complete(childId: string, outcome: ExecutionOutcome<JsonValue>): Promise<void>;
}
```

### `agentic/subagents/ChildAgentBinding.ts`

Returns a newly assembled child AgenticMindUnit through the shared executor contract and the registered result validator. The factory owns concrete session/model/tool assembly.

```typescript
import type { IExecutor } from "../../executors/contracts/IExecutor";
import type { IResultContract } from "../../contracts/validation/IResultContract";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
export type ChildAgentBinding = Readonly<{ unit: IExecutor<void, JsonValue>; resultContract: IResultContract<JsonValue> }>;
```

### `agentic/subagents/IAgenticUnitFactory.ts`

Assembles one child from trusted registrations. It binds the exact admitted assignment/scope, pinned eligible model, attenuated tools/files, result contract, shared ledger child scope, separate notebook/session, and inherited abort signal. It grants no new capability.

```typescript
import type { AdmittedSubAgent } from "./AdmittedSubAgent";
import type { ChildAgentBinding } from "./ChildAgentBinding";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
export interface IAgenticUnitFactory { create(child: AdmittedSubAgent, context: IExecutionContext): Promise<ChildAgentBinding>; }
```

### `agentic/subagents/IChildAgentBuilder.ts`

Supplies one composition-owned role/result-contract registration. Its implementation creates the page-19 AgenticMindUnit and fresh session factory; it does not execute the child while building it.

```typescript
import type { AdmittedSubAgent } from "./AdmittedSubAgent";
import type { ChildAgentBinding } from "./ChildAgentBinding";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
export interface IChildAgentBuilder {
  readonly modelRole: string; readonly resultContractId: string;
  build(child: AdmittedSubAgent, context: IExecutionContext): Promise<ChildAgentBinding>;
}
```

### `agentic/subagents/RegisteredAgenticUnitFactory.ts`

Resolves registered builders through a Map. No provider-name/tool-name conditional or model-generated constructor is used.

```typescript
import type { IAgenticUnitFactory } from "./IAgenticUnitFactory";
import type { IChildAgentBuilder } from "./IChildAgentBuilder";
import type { AdmittedSubAgent } from "./AdmittedSubAgent";
import type { ChildAgentBinding } from "./ChildAgentBinding";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError";
export class RegisteredAgenticUnitFactory implements IAgenticUnitFactory {
  private readonly builders = new Map<string, IChildAgentBuilder>();
  constructor(builders: readonly IChildAgentBuilder[]) {
    for (const builder of builders) { const key = this.key(builder.modelRole,builder.resultContractId); if (this.builders.has(key)) throw new SubAgentCoordinationError(); this.builders.set(key,builder); }
  }
  async create(child: AdmittedSubAgent, context: IExecutionContext): Promise<ChildAgentBinding> {
    const builder = this.builders.get(this.key(child.request.modelRole,child.request.resultContractId));
    if (builder === undefined) throw new SubAgentCoordinationError();
    const binding = await builder.build(child,context);
    if (binding.resultContract.id !== child.request.resultContractId) throw new SubAgentCoordinationError();
    return binding;
  }
  private key(role: string, contract: string): string { return JSON.stringify([role,contract]); }
}
```

### `agentic/subagents/SubAgentCoordinator.ts`

Owns mandatory permission narrowing, durable admission, child budget linkage, construction and outcome delivery. The parent awaits the child; this default coordinator does not launch parallel siblings.

```typescript
import { createSubAgentCommandKey } from "./createSubAgentCommandKey";
import type { SubAgentAuthority } from "./SubAgentAuthority";
import type { SubAgentRequest } from "./SubAgentRequest";
import type { SubAgentOutcome } from "./SubAgentOutcome";
import type { AdmittedSubAgent } from "./AdmittedSubAgent";
import type { ISubAgentJournal } from "./ISubAgentJournal";
import type { IAgenticUnitFactory } from "./IAgenticUnitFactory";
import type { IPolicy } from "../../contracts/IPolicy";
import type { SubAgentPolicyInput } from "./SubAgentPolicyInput";
import type { SubAgentPolicyDecision } from "./SubAgentPolicyDecision";
import type { IUsageLedgerStore } from "../../usage/IUsageLedgerStore";
import type { IClock } from "../../contracts/runtime/IClock";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import { usageDimensions } from "../../usage/usageDimensions";
import { ExecutionBoundaryGuard } from "../../execution-control/ExecutionBoundaryGuard";
import { SubAgentRequestContract } from "./SubAgentRequestContract";
import { ChildOutcomeContract } from "./ChildOutcomeContract";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError";
export class SubAgentCoordinator {
  private readonly authority: SubAgentAuthority;
  constructor(authority: SubAgentAuthority,
    private readonly requests: SubAgentRequestContract,
    private readonly outcomes: ChildOutcomeContract,
    private readonly policy: IPolicy<SubAgentPolicyInput,SubAgentPolicyDecision>,
    private readonly journal: ISubAgentJournal,
    private readonly factory: IAgenticUnitFactory,
    private readonly ledger: IUsageLedgerStore,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock) {
    if (![authority.runId,authority.parentSessionId,authority.parentBudgetScopeId].every(id => /^[A-Za-z0-9_.:-]{1,128}$/.test(id)) ||
        (authority.parentChildId !== null && !/^[A-Za-z0-9_.:-]{1,128}$/.test(authority.parentChildId)) ||
        !Number.isSafeInteger(authority.parentDepth) ||
        authority.parentDepth < 0 ||
        authority.parentDepth > 8 ||
        (authority.parentChildId === null) !== (authority.parentDepth === 0) ||
        !usageDimensions.every(key => Number.isSafeInteger(authority.limits[key]) && authority.limits[key] >= 0)) throw new SubAgentCoordinationError();
    this.authority = Object.freeze({ ...authority, allowedToolIds: Object.freeze([...authority.allowedToolIds]), allowedModelRoles: Object.freeze([...authority.allowedModelRoles]), allowedResultContractIds: Object.freeze([...authority.allowedResultContractIds]), allowedFilePaths: Object.freeze([...authority.allowedFilePaths]), limits: Object.freeze({...authority.limits}) });
  }
  async spawn(raw: unknown, context: IExecutionContext): Promise<SubAgentOutcome> {
    const auth = this.authority;
    if (context.identity.runId !== auth.runId || context.identity.sessionId !== auth.parentSessionId) throw new SubAgentCoordinationError();
    if (!auth.canSpawn) return { status: "rejected", code: "SPAWN_NOT_PERMITTED" };
    const checked = await this.requests.validate(raw); if (!checked.valid) return { status: "rejected", code: "INVALID_SUB_AGENT_REQUEST" };
    const proposed = checked.value;
    if (!auth.allowedModelRoles.includes(proposed.modelRole) ||
        !auth.allowedResultContractIds.includes(proposed.resultContractId) ||
        proposed.toolIds.some(id => !auth.allowedToolIds.includes(id)) ||
        proposed.filePaths.some(path => !auth.allowedFilePaths.includes(path)) ||
        (proposed.access === "edit" && !auth.canEdit) ||
        usageDimensions.some(key => proposed.limits[key] > auth.limits[key])) return { status: "rejected", code: "CHILD_CAPABILITY_ESCALATION" };
    const deadlines = [context.deadlineEpochMs,proposed.deadlineEpochMs].filter((value): value is number => value !== null);
    const request: SubAgentRequest = Object.freeze({ ...proposed, deadlineEpochMs: deadlines.length === 0 ? null : Math.min(...deadlines) });
    const guard = new ExecutionBoundaryGuard(this.clock,context.signal,request.deadlineEpochMs);
    if (guard.check() !== null) return { status: "rejected", code: "CHILD_CONTROL_STOP" };
    const decision = await this.policy.apply({ request, depth: auth.parentDepth + 1 });
    if (!decision.allowed) return { status: "rejected", code: /^[A-Z0-9_]{1,64}$/.test(decision.code) ? decision.code : "CHILD_POLICY_REJECTED" };
    if (guard.check() !== null) return { status: "rejected", code: "CHILD_CONTROL_STOP" };
    const candidate: AdmittedSubAgent = Object.freeze({ childId: this.ids.nextId(), sessionId: this.ids.nextId(), operationId: this.ids.nextId(), budgetScopeId: this.ids.nextId(), parentSessionId: auth.parentSessionId, parentChildId: auth.parentChildId, parentBudgetScopeId: auth.parentBudgetScopeId, depth: auth.parentDepth + 1, runId: auth.runId, scope: Object.freeze({...context.scope}), request });
    const key = createSubAgentCommandKey(candidate);
    const claim = await this.journal.claim({ commandId: context.identity.operationId, requestKey: key, candidate });
    if (claim.status === "existing") return claim.response;
    if (claim.status === "rejected") return claim;
    const child = claim.child;
    await this.ledger.mutate(ledger => ledger.addScope({ id: child.budgetScopeId, parentId: child.parentBudgetScopeId, limits: child.request.limits }));
    const childContext: IExecutionContext = Object.freeze({ ...context, deadlineEpochMs: child.request.deadlineEpochMs, identity: Object.freeze({ ...context.identity, operationId: child.operationId, parentOperationId: context.identity.operationId, sessionId: child.sessionId }) });
    const stopped = guard.check();
    if (stopped !== null) return this.deliver(child, { status: "stopped", reason: stopped, partial: { summary: "Child admitted; execution did not start.", evidenceRefs: [], artifactRefs: [], unresolved: ["Child assignment is incomplete."] }, pendingOperationRefs: [] });
    const binding = await this.factory.create(child,childContext);
    if (binding.resultContract.id !== request.resultContractId) throw new SubAgentCoordinationError();
    const beforeExecute = guard.check();
    if (beforeExecute !== null) return this.deliver(child, { status: "stopped", reason: beforeExecute, partial: { summary: "Child constructed; execution did not start.", evidenceRefs: [], artifactRefs: [], unresolved: ["Child assignment is incomplete."] }, pendingOperationRefs: [] });
    let rawOutcome: unknown;
    try { rawOutcome = await binding.unit.execute(undefined,childContext); }
    catch { return { status: "pending", childId: child.childId, pendingOperationRefs: [child.operationId] }; }
    const outcome = await this.outcomes.validate(rawOutcome);
    if (!outcome.valid) return { status: "pending", childId: child.childId, pendingOperationRefs: [child.operationId] };
    if (outcome.value.status === "completed") {
      const validResult = await binding.resultContract.validate(outcome.value.result);
      if (!validResult.valid) return { status: "pending", childId: child.childId, pendingOperationRefs: [child.operationId] };
      return this.deliver(child,{ status: "completed", result: validResult.value });
    }
    return this.deliver(child,outcome.value);
  }
  private async deliver(child: AdmittedSubAgent, raw: unknown): Promise<SubAgentOutcome> {
    const checked = await this.outcomes.validate(raw); if (!checked.valid) throw new SubAgentCoordinationError();
    await this.journal.complete(child.childId,checked.value);
    return { status: "returned", childId: child.childId, sessionId: child.sessionId, outcome: checked.value };
  }
}
```

### `agentic/subagents/SubAgentRecord.ts`

Stores the original command, admitted child and validated terminal outcome. A null outcome or unresolved pending references keep the scheduling claim open.

```typescript
import type { SubAgentClaim } from "./SubAgentClaim";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
export type SubAgentRecord = Readonly<{ claim: SubAgentClaim; outcome: ExecutionOutcome<JsonValue> | null }>;
```

### `agentic/subagents/SubAgentRunSnapshot.ts`

Persists one scoped run-wide child counter and admission journal. Records are never removed to make room for more children; all descendants consume the same total cap.

```typescript
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import type { SubAgentRecord } from "./SubAgentRecord";
export type SubAgentRunSnapshot = Readonly<{
  schemaVersion: 1; runId: string; rootSessionId: string; rootBudgetScopeId: string;
  scope: ExecutionScopeRef; maxChildren: number; maxDepth: number;
  records: readonly SubAgentRecord[];
}>;
```

### `agentic/subagents/createSubAgentCommandKey.ts`

Creates the same bounded command binding in the coordinator and restored-state verifier. It uses fixed scope fields and canonical validated request data; it is private module plumbing, not a cryptographic authorization token.

```typescript
import type { AdmittedSubAgent } from "./AdmittedSubAgent";
export function createSubAgentCommandKey(child: AdmittedSubAgent): string {
  const request = child.request;
  return JSON.stringify({ parentSessionId: child.parentSessionId, parentChildId: child.parentChildId, parentBudgetScopeId: child.parentBudgetScopeId,
    scope: { scopeId: child.scope.scopeId, projectId: child.scope.projectId, workspaceId: child.scope.workspaceId ?? null },
    request: { goal: request.goal, acceptanceCriteria: request.acceptanceCriteria, sourceRefs: request.sourceRefs, modelRole: request.modelRole, resultContractId: request.resultContractId, toolIds: request.toolIds, access: request.access, filePaths: request.filePaths, maxTurns: request.maxTurns, limits: { modelCalls: request.limits.modelCalls, inputTokens: request.limits.inputTokens, outputTokens: request.limits.outputTokens, toolCalls: request.limits.toolCalls, iterations: request.limits.iterations, fixes: request.limits.fixes }, deadlineEpochMs: request.deadlineEpochMs } });
}
```

### `agentic/subagents/SubAgentState.ts`

Owns deterministic run-wide admission and sequential scheduling invariants. A nested child may run while its ancestors await it; siblings cannot overlap, and uncertain effects retain their claims.

```typescript
import type { SubAgentRunSnapshot } from "./SubAgentRunSnapshot";
import type { SubAgentRecord } from "./SubAgentRecord";
import type { SubAgentClaim } from "./SubAgentClaim";
import type { SubAgentClaimOutcome } from "./SubAgentClaimOutcome";
import type { AdmittedSubAgent } from "./AdmittedSubAgent";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import { usageDimensions } from "../../usage/usageDimensions";
import { createSubAgentCommandKey } from "./createSubAgentCommandKey";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError";
export class SubAgentState {
  private readonly records: SubAgentRecord[];
  constructor(private readonly initial: SubAgentRunSnapshot) {
    if (initial.schemaVersion !== 1 ||
        !Number.isSafeInteger(initial.maxChildren) ||
        initial.maxChildren < 0 ||
        initial.maxChildren > 64 ||
        !Number.isSafeInteger(initial.maxDepth) ||
        initial.maxDepth < 0 ||
        initial.maxDepth > 8 ||
        initial.records.length > initial.maxChildren) this.invalid();
    this.records = [];
    for (const record of initial.records) {
      this.validateCandidate(record.claim);
      if (this.records.some(old => old.claim.commandId === record.claim.commandId ||
        this.ids(old.claim.candidate).some(id => this.ids(record.claim.candidate).includes(id)))) this.invalid();
      this.records.push(record);
    }
    const open = this.records.filter(record => this.open(record));
    for (const record of open) {
      const ancestors = this.ancestors(record.claim.candidate.parentChildId);
      if (ancestors.some(parent => !this.open(parent))) this.invalid();
      if (open.some(other => other !== record && !ancestors.includes(other) && !this.ancestors(other.claim.candidate.parentChildId).includes(record))) this.invalid();
    }
  }
  claim(input: SubAgentClaim): SubAgentClaimOutcome {
    const old = this.records.find(record => record.claim.commandId === input.commandId);
    if (old !== undefined) {
      if (old.claim.requestKey !== input.requestKey) this.invalid();
      const child = old.claim.candidate;
      return { status: "existing", response: old.outcome === null ? { status: "pending", childId: child.childId, pendingOperationRefs: [child.operationId] } : { status: "returned", childId: child.childId, sessionId: child.sessionId, outcome: old.outcome } };
    }
    if (this.records.length >= this.initial.maxChildren) return { status: "rejected", code: "CHILD_COUNT_LIMIT" };
    if (input.candidate.depth > this.initial.maxDepth) return { status: "rejected", code: "CHILD_DEPTH_LIMIT" };
    this.validateCandidate(input);
    const ancestors = this.ancestors(input.candidate.parentChildId);
    if (ancestors.some(parent => parent.outcome !== null) ||
        this.records.some(record => this.open(record) && !ancestors.includes(record))) return { status: "rejected", code: "SEQUENTIAL_CHILD_BUSY" };
    if (this.records.some(record => this.ids(record.claim.candidate).some(id => this.ids(input.candidate).includes(id)))) this.invalid();
    this.records.push(Object.freeze({ claim: input, outcome: null }));
    return { status: "admitted", child: input.candidate };
  }
  complete(childId: string, outcome: ExecutionOutcome<JsonValue>): void {
    const index = this.records.findIndex(record => record.claim.candidate.childId === childId); if (index < 0) this.invalid();
    const old = this.records[index];
    if (old.outcome !== null) { if (this.canonical(old.outcome) !== this.canonical(outcome)) this.invalid(); return; }
    const unresolvedChildren = this.records.filter(record => this.open(record) && this.ancestors(record.claim.candidate.parentChildId).includes(old));
    if (unresolvedChildren.length > 0 && (outcome.status === "completed" || outcome.pendingOperationRefs.length === 0)) this.invalid();
    this.records[index] = Object.freeze({ claim: old.claim, outcome });
  }
  snapshot(): SubAgentRunSnapshot { return Object.freeze({ ...this.initial, records: Object.freeze([...this.records]) }); }
  private validateCandidate(input: SubAgentClaim): void {
    const child = input.candidate;
    if (!this.id(input.commandId) ||
        !this.ids(child).every(value => this.id(value)) ||
        new Set(this.ids(child)).size !== 4 ||
        this.ids(child).some(value => [this.initial.runId,this.initial.rootSessionId,this.initial.rootBudgetScopeId,input.commandId].includes(value)) ||
        !this.id(child.parentSessionId) ||
        !this.id(child.parentBudgetScopeId) ||
        input.requestKey !== createSubAgentCommandKey(child) ||
        child.runId !== this.initial.runId ||
        child.scope.scopeId !== this.initial.scope.scopeId ||
        child.scope.projectId !== this.initial.scope.projectId ||
        child.scope.workspaceId !== this.initial.scope.workspaceId ||
        child.depth < 1 ||
        child.depth > this.initial.maxDepth) this.invalid();
    if (child.parentChildId === null) { if (child.parentSessionId !== this.initial.rootSessionId ||
        child.parentBudgetScopeId !== this.initial.rootBudgetScopeId ||
        child.depth !== 1) this.invalid(); return; }
    const parent = this.records.find(record => record.claim.candidate.childId === child.parentChildId)?.claim.candidate;
    if (parent === undefined ||
        child.parentSessionId !== parent.sessionId ||
        child.parentBudgetScopeId !== parent.budgetScopeId ||
        child.depth !== parent.depth + 1 ||
        (child.request.access === "edit" && parent.request.access !== "edit") ||
        child.request.toolIds.some(id => !parent.request.toolIds.includes(id)) ||
        child.request.filePaths.some(path => !parent.request.filePaths.includes(path)) ||
        usageDimensions.some(key => child.request.limits[key] > parent.request.limits[key]) ||
        (parent.request.deadlineEpochMs !== null && (child.request.deadlineEpochMs === null ||
        child.request.deadlineEpochMs > parent.request.deadlineEpochMs))) this.invalid();
  }
  private id(value: string): boolean { return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,128}$/.test(value); }
  private ids(child: AdmittedSubAgent): readonly string[] { return [child.childId,child.sessionId,child.operationId,child.budgetScopeId]; }
  private ancestors(parentId: string | null): readonly SubAgentRecord[] {
    const result: SubAgentRecord[] = []; let current = parentId;
    while (current !== null) { const record = this.records.find(item => item.claim.candidate.childId === current); if (record === undefined ||
        result.includes(record)) this.invalid(); result.push(record); current = record.claim.candidate.parentChildId; }
    return result;
  }
  private open(record: SubAgentRecord): boolean { return record.outcome === null || (record.outcome.status !== "completed" && record.outcome.pendingOperationRefs.length > 0); }
  private canonical(value: unknown): string { return JSON.stringify(value, (_key, item: unknown) => item !== null && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([left],[right]) => left < right ? -1 : left > right ? 1 : 0)) : item); }
  private invalid(): never { throw new SubAgentCoordinationError(); }
}
```

### `agentic/subagents/SubAgentRunSnapshotContract.ts`

Validates every restored request/outcome and all state-machine bindings before SQL state can be used. Structural validation does not authorize source references or replace a trusted initial root binding.

```typescript
import type { IResultContract } from "../../contracts/validation/IResultContract";
import type { ValidationResult } from "../../contracts/validation/ValidationResult";
import type { SubAgentRunSnapshot } from "./SubAgentRunSnapshot";
import { JsonValueContract } from "../../persistence/JsonValueContract";
import { SubAgentRequestContract } from "./SubAgentRequestContract";
import { ChildOutcomeContract } from "./ChildOutcomeContract";
import { SubAgentState } from "./SubAgentState";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError";
export class SubAgentRunSnapshotContract implements IResultContract<SubAgentRunSnapshot> {
  readonly id = "sub-agent-run-snapshot"; readonly version = "1";
  constructor(private readonly json: JsonValueContract, private readonly requests: SubAgentRequestContract, private readonly outcomes: ChildOutcomeContract) {}
  async validate(raw: unknown): Promise<ValidationResult<SubAgentRunSnapshot>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (!this.object(row) ||
        !this.keys(row,["schemaVersion","runId","rootSessionId","rootBudgetScopeId","scope","maxChildren","maxDepth","records"]) ||
        row.schemaVersion !== 1 ||
        !this.validId(row.runId) ||
        !this.validId(row.rootSessionId) ||
        !this.validId(row.rootBudgetScopeId) ||
        !this.scope(row.scope) ||
        !Number.isSafeInteger(row.maxChildren) ||
        !Number.isSafeInteger(row.maxDepth) ||
        !Array.isArray(row.records) ||
        row.records.length > 64) return this.invalid();
    for (const record of row.records) {
      if (!this.object(record) ||
        !this.keys(record,["claim","outcome"]) ||
        !this.object(record.claim) ||
        !this.keys(record.claim,["commandId","requestKey","candidate"]) ||
        !this.validId(record.claim.commandId) ||
        typeof record.claim.requestKey !== "string" ||
        record.claim.requestKey.length > 32768) return this.invalid();
      const child = record.claim.candidate;
      if (!this.object(child) ||
        !this.keys(child,["childId","sessionId","operationId","budgetScopeId","parentSessionId","parentChildId","parentBudgetScopeId","depth","runId","scope","request"]) ||
        ![child.childId,child.sessionId,child.operationId,child.budgetScopeId,child.parentSessionId,child.parentBudgetScopeId,child.runId].every(value => this.validId(value)) ||
        !(child.parentChildId === null ||
        this.validId(child.parentChildId)) ||
        !Number.isSafeInteger(child.depth) ||
        !this.scope(child.scope) ||
        !(await this.requests.validate(child.request)).valid ||
        (record.outcome !== null && !(await this.outcomes.validate(record.outcome)).valid)) return this.invalid();
    }
    try { const state = new SubAgentState(checked.value as unknown as SubAgentRunSnapshot); return { valid: true, value: state.snapshot() }; }
    catch (error) { if (!(error instanceof SubAgentCoordinationError)) throw error; return this.invalid(); }
  }
  private object(value: unknown): value is Record<string,unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string,unknown>, keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private validId(value: unknown): boolean { return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,128}$/.test(value); }
  private scope(value: unknown): boolean { return this.object(value) && (this.keys(value,["scopeId","projectId"]) || this.keys(value,["scopeId","projectId","workspaceId"])) && this.validId(value.scopeId) && this.validId(value.projectId) && (value.workspaceId === undefined || this.validId(value.workspaceId)); }
  private invalid(): ValidationResult<never> { return { valid: false, issues: [{ path: [], code: "INVALID_CHILD_JOURNAL", message: "Sub-agent journal does not satisfy its versioned contract." }] }; }
}
```

### `agentic/subagents/SubAgentJournalStatements.ts`

Groups dialect-specific parameterized statements without branching on the database provider inside the journal.

```typescript
export type SubAgentJournalStatements = Readonly<{ schema: string; insert: string; lock: string; read: string; update: string }>;
```

### `agentic/subagents/sqliteSubAgentJournalStatements.ts`

Uses a scoped run row and transaction-held SQLite write lock for atomic cross-worker admission; restart never overwrites an existing journal.

```typescript
import type { SubAgentJournalStatements } from "./SubAgentJournalStatements";
export const sqliteSubAgentJournalStatements: SubAgentJournalStatements = Object.freeze({
  schema: "CREATE TABLE IF NOT EXISTS kushibot_sub_agent_runs_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, run_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(scope_id, project_id, run_id))",
  insert: "INSERT INTO kushibot_sub_agent_runs_v1(scope_id, project_id, run_id, payload) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
  lock: "UPDATE kushibot_sub_agent_runs_v1 SET payload = payload WHERE scope_id = ? AND project_id = ? AND run_id = ?",
  read: "SELECT payload FROM kushibot_sub_agent_runs_v1 WHERE scope_id = ? AND project_id = ? AND run_id = ?",
  update: "UPDATE kushibot_sub_agent_runs_v1 SET payload = ? WHERE scope_id = ? AND project_id = ? AND run_id = ?"
});
```

### `agentic/subagents/postgresqlSubAgentJournalStatements.ts`

Uses PostgreSQL numbered parameters and a transaction-held row update lock. It relies on the existing normalized ISqlDatabase driver contract.

```typescript
import type { SubAgentJournalStatements } from "./SubAgentJournalStatements";
export const postgresqlSubAgentJournalStatements: SubAgentJournalStatements = Object.freeze({
  schema: "CREATE TABLE IF NOT EXISTS kushibot_sub_agent_runs_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, run_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(scope_id, project_id, run_id))",
  insert: "INSERT INTO kushibot_sub_agent_runs_v1(scope_id, project_id, run_id, payload) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
  lock: "UPDATE kushibot_sub_agent_runs_v1 SET payload = payload WHERE scope_id = $1 AND project_id = $2 AND run_id = $3",
  read: "SELECT payload FROM kushibot_sub_agent_runs_v1 WHERE scope_id = $1 AND project_id = $2 AND run_id = $3",
  update: "UPDATE kushibot_sub_agent_runs_v1 SET payload = $1 WHERE scope_id = $2 AND project_id = $3 AND run_id = $4"
});
```

### `agentic/subagents/SqlSubAgentJournal.ts`

Serializes short state-only transactions per scoped run. Child execution, policies, model calls and tools occur outside the database lock. Saved outcomes are returned only after the durable update commits.

```typescript
import type { ISubAgentJournal } from "./ISubAgentJournal";
import type { SubAgentClaim } from "./SubAgentClaim";
import type { SubAgentClaimOutcome } from "./SubAgentClaimOutcome";
import type { SubAgentRunSnapshot } from "./SubAgentRunSnapshot";
import type { SubAgentJournalStatements } from "./SubAgentJournalStatements";
import type { ISqlDatabase } from "../../persistence/sql/ISqlDatabase";
import type { ISqlExecutor } from "../../persistence/sql/ISqlExecutor";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
import { SubAgentState } from "./SubAgentState";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError";
export class SqlSubAgentJournal implements ISubAgentJournal {
  private readonly key: readonly string[];
  private binding: string | null = null;
  constructor(private readonly database: ISqlDatabase,
    private readonly sql: SubAgentJournalStatements,
    private readonly codec: IRecordCodec<SubAgentRunSnapshot>, scopeId: string, projectId: string, runId: string) {
    if (![scopeId,projectId,runId].every(value => /^[A-Za-z0-9_.:-]{1,128}$/.test(value))) throw new SubAgentCoordinationError();
    this.key = Object.freeze([scopeId,projectId,runId]);
  }
  async initialize(initial: SubAgentRunSnapshot): Promise<void> {
    if (initial.records.length !== 0) throw new SubAgentCoordinationError();
    const payload = await this.codec.encode(initial);
    const expected = this.bind(initial);
    await this.database.migrationTransaction(async tx => {
      await tx.query(this.sql.schema,[]); await tx.query(this.sql.insert,[...this.key,payload]);
      const saved = await this.load(tx); if (this.bind(saved) !== expected) throw new SubAgentCoordinationError();
    });
    this.binding = expected;
  }
  async read(): Promise<SubAgentRunSnapshot> { if (this.binding === null) throw new SubAgentCoordinationError(); const snapshot = await this.load(this.database); if (this.bind(snapshot) !== this.binding) throw new SubAgentCoordinationError(); return snapshot; }
  claim(input: SubAgentClaim): Promise<SubAgentClaimOutcome> { return this.change(state => state.claim(input)); }
  complete(childId: string, outcome: ExecutionOutcome<JsonValue>): Promise<void> { return this.change(state => state.complete(childId,outcome)); }
  private change<T>(work: (state: SubAgentState) => T): Promise<T> {
    if (this.binding === null) throw new SubAgentCoordinationError();
    return this.database.transaction(async tx => {
      if ((await tx.query(this.sql.lock,this.key)).affectedRows !== 1) throw new SubAgentCoordinationError();
      const snapshot = await this.load(tx); if (this.bind(snapshot) !== this.binding) throw new SubAgentCoordinationError();
      const state = new SubAgentState(snapshot); const result = work(state);
      const payload = await this.codec.encode(state.snapshot());
      if ((await tx.query(this.sql.update,[payload,...this.key])).affectedRows !== 1) throw new SubAgentCoordinationError();
      return result;
    });
  }
  private async load(tx: ISqlExecutor): Promise<SubAgentRunSnapshot> {
    const rows = (await tx.query(this.sql.read,this.key)).rows;
    if (rows.length !== 1 || typeof rows[0].payload !== "string") throw new SubAgentCoordinationError();
    const snapshot = await this.codec.decode(rows[0].payload);
    if (snapshot.scope.scopeId !== this.key[0] || snapshot.scope.projectId !== this.key[1] || snapshot.runId !== this.key[2]) throw new SubAgentCoordinationError();
    return snapshot;
  }
  private bind(snapshot: SubAgentRunSnapshot): string { return JSON.stringify([snapshot.schemaVersion,snapshot.runId,snapshot.rootSessionId,snapshot.rootBudgetScopeId,snapshot.scope.scopeId,snapshot.scope.projectId,snapshot.scope.workspaceId ?? null,snapshot.maxChildren,snapshot.maxDepth]); }
}
```

### `agentic/subagents/IChildSessionFactoryProvider.ts`

Supplies the application-owned page-19 session assembly for an admitted child. It constructs fresh, scope-bound collaborators and may not start the child during construction.

```typescript
import type { IAgenticSessionFactory } from "../sessions/IAgenticSessionFactory";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { AdmittedSubAgent } from "./AdmittedSubAgent";
export interface IChildSessionFactoryProvider { create(child: AdmittedSubAgent, context: IExecutionContext): Promise<IAgenticSessionFactory<JsonValue>>; }
```

### `agentic/subagents/SessionChildAgentBuilder.ts`

Creates the actual reusable AgenticMindUnit for one registered model-role/result-contract pair. The provider assembles its separate session, so production children run the same bounded loop as ordinary agents.

```typescript
import type { IChildAgentBuilder } from "./IChildAgentBuilder";
import type { IChildSessionFactoryProvider } from "./IChildSessionFactoryProvider";
import type { AdmittedSubAgent } from "./AdmittedSubAgent";
import type { ChildAgentBinding } from "./ChildAgentBinding";
import type { IResultContract } from "../../contracts/validation/IResultContract";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import { AgenticMindUnit } from "../sessions/AgenticMindUnit";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError";
export class SessionChildAgentBuilder implements IChildAgentBuilder {
  readonly resultContractId: string;
  constructor(readonly modelRole: string,
    private readonly resultContract: IResultContract<JsonValue>,
    private readonly sessions: IChildSessionFactoryProvider) { this.resultContractId = resultContract.id; }
  async build(child: AdmittedSubAgent, context: IExecutionContext): Promise<ChildAgentBinding> {
    if (child.request.modelRole !== this.modelRole ||
        child.request.resultContractId !== this.resultContractId ||
        context.identity.sessionId !== child.sessionId ||
        context.identity.operationId !== child.operationId) throw new SubAgentCoordinationError();
    const factory = await this.sessions.create(child,context);
    return Object.freeze({ unit: new AgenticMindUnit(factory), resultContract: this.resultContract });
  }
}
```

### `agentic/subagents/subAgentRequestSchema.ts`

Publishes the bounded JSON-action tool schema. The result contract remains authoritative even when a provider or model ignores schema hints.

```typescript
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import { usageDimensions } from "../../usage/usageDimensions";
export const subAgentRequestSchema: JsonValue = Object.freeze<JsonValue>({
  type: "object", additionalProperties: false,
  required: ["goal","acceptanceCriteria","sourceRefs","modelRole","resultContractId","toolIds","access","filePaths","maxTurns","limits","deadlineEpochMs"],
  properties: {
    goal: { type: "string", minLength: 1, maxLength: 2048 },
    acceptanceCriteria: { type: "array", minItems: 1, maxItems: 16, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 512 } },
    sourceRefs: { type: "array", maxItems: 16, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 256 } },
    modelRole: { type: "string", pattern: "^[A-Za-z0-9_.:-]{1,128}$" },
    resultContractId: { type: "string", pattern: "^[A-Za-z0-9_.:-]{1,128}$" },
    toolIds: { type: "array", maxItems: 16, uniqueItems: true, items: { type: "string", pattern: "^[A-Za-z0-9_.:-]{1,128}$" } },
    access: { enum: ["read-only","edit"] },
    filePaths: { type: "array", maxItems: 16, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 256 } },
    maxTurns: { type: "integer", minimum: 1, maximum: 128 },
    limits: { type: "object", additionalProperties: false, required: [...usageDimensions], properties: Object.fromEntries(usageDimensions.map(key => [key,{ type: "integer", minimum: 0, maximum: 1000000000 }])) },
    deadlineEpochMs: { anyOf: [{ type: "null" },{ type: "integer", minimum: 0 }] }
  }
});
```

### `agentic/subagents/SubAgentArgumentsContract.ts`

Bridges the typed request validator to the existing tool registry JSON contract. The coordinator validates again at its own public boundary.

```typescript
import type { IResultContract } from "../../contracts/validation/IResultContract";
import type { ValidationResult } from "../../contracts/validation/ValidationResult";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import { JsonValueContract } from "../../persistence/JsonValueContract";
import { SubAgentRequestContract } from "./SubAgentRequestContract";
export class SubAgentArgumentsContract implements IResultContract<JsonValue> {
  readonly id = "spawn-sub-agent-arguments"; readonly version = "1";
  constructor(private readonly requests: SubAgentRequestContract, private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<JsonValue>> { const checked = await this.requests.validate(raw); return checked.valid ? this.json.validate(checked.value) : checked; }
}
```

### `agentic/subagents/SpawnSubAgentTool.ts`

Exposes spawning only through an explicitly registered permitted tool. It awaits the coordinator and returns a bounded observation; it does not merge a child answer into the parent result or approve edits.

```typescript
import type { ITool } from "../../tools/ITool";
import type { ToolDescriptor } from "../../tools/ToolDescriptor";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import { JsonValueContract } from "../../persistence/JsonValueContract";
import { SubAgentArgumentsContract } from "./SubAgentArgumentsContract";
import { SubAgentCoordinator } from "./SubAgentCoordinator";
import { subAgentRequestSchema } from "./subAgentRequestSchema";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError";
export class SpawnSubAgentTool implements ITool {
  readonly descriptor: ToolDescriptor = Object.freeze({ id: "spawn-sub-agent", version: "1", description: "Run one focused sub-agent sequentially with narrower inherited capabilities; return its completed, partial, or pending outcome.", inputSchema: subAgentRequestSchema, maxArgumentBytes: 16384, maxOutputBytes: 65536 });
  constructor(private readonly coordinator: SubAgentCoordinator, readonly argumentsContract: SubAgentArgumentsContract, readonly resultContract: JsonValueContract) {}
  async execute(argumentsValue: JsonValue, context: IExecutionContext): Promise<JsonValue> {
    const response = await this.coordinator.spawn(argumentsValue,context);
    const checked = await this.resultContract.validate(response); if (!checked.valid) throw new SubAgentCoordinationError();
    return checked.value;
  }
}
```

### `examples/subagents/LoginSubAgentExample.ts`

Shows two editing children requested in sequence against the same exact login.ts scope. Child B is requested only after A returns completed; its session must inspect the latest saved workspace revision.

```typescript
import type { IExecutionContext } from "../../index";
import type { IIdGenerator } from "../../index";
import type { SubAgentRequest } from "../../index";
import type { SubAgentOutcome } from "../../index";
import { SubAgentCoordinator } from "../../index";
export class LoginSubAgentExample {
  constructor(private readonly children: SubAgentCoordinator, private readonly ids: IIdGenerator) {}
  async run(context: IExecutionContext): Promise<Readonly<{ first: SubAgentOutcome; second: SubAgentOutcome | null }>> {
    const first = await this.children.spawn(this.request("Add Google-login validation while preserving password login."),this.command(context));
    if (first.status !== "returned" || first.outcome.status !== "completed") return { first, second: null };
    const second = await this.children.spawn(this.request("Inspect the current login.ts after child A, then add the expiry check without removing A's Google-login validation."),this.command(context));
    return { first, second };
  }
  private command(context: IExecutionContext): IExecutionContext { return Object.freeze({ ...context, identity: Object.freeze({ ...context.identity, operationId: this.ids.nextId(), parentOperationId: context.identity.operationId }) }); }
  private request(goal: string): SubAgentRequest { return Object.freeze({ goal, acceptanceCriteria: ["Password login remains supported.","Use current source revisions and return saved change/check references."], sourceRefs: [], modelRole: "login-editor", resultContractId: "login-change-report", toolIds: ["read-source","edit-source","check-login"], access: "edit", filePaths: ["src/login.ts"], maxTurns: 6, limits: { modelCalls: 6, inputTokens: 16000, outputTokens: 4000, toolCalls: 6, iterations: 6, fixes: 1 }, deadlineEpochMs: null }); }
}
```

### `tests/subagents/MemorySubAgentJournal.ts`

Provides an offline scheduling fixture around the same domain state. This process-local fake is not durable, does not model multi-process locks, and must not be registered as a production journal.

```typescript
import type { ISubAgentJournal } from "../../agentic/subagents/ISubAgentJournal";
import type { SubAgentClaim } from "../../agentic/subagents/SubAgentClaim";
import type { SubAgentClaimOutcome } from "../../agentic/subagents/SubAgentClaimOutcome";
import type { SubAgentRunSnapshot } from "../../agentic/subagents/SubAgentRunSnapshot";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import { SubAgentState } from "../../agentic/subagents/SubAgentState";
export class MemorySubAgentJournal implements ISubAgentJournal {
  private readonly state: SubAgentState;
  constructor(initial: SubAgentRunSnapshot) { this.state = new SubAgentState(initial); }
  async claim(input: SubAgentClaim): Promise<SubAgentClaimOutcome> { return this.state.claim(input); }
  async complete(childId: string, outcome: ExecutionOutcome<JsonValue>): Promise<void> { this.state.complete(childId,outcome); }
  async read(): Promise<SubAgentRunSnapshot> { return this.state.snapshot(); }
  snapshot(): SubAgentRunSnapshot { return this.state.snapshot(); }
}
```

### `examples/subagents/createSubAgentJournalExample.ts`

Shows startup assembly through the supported public API. The host supplies its real database, trusted empty root snapshot and selected dialect statements; initialize preserves saved admissions on restart.

```typescript
import type { ISqlDatabase, SubAgentRunSnapshot, SubAgentJournalStatements } from "../../index";
import { JsonValueContract, JsonRecordCodec, SubAgentRequestContract, ChildOutcomeContract, SubAgentRunSnapshotContract, SqlSubAgentJournal } from "../../index";
export async function createSubAgentJournalExample(database: ISqlDatabase, initial: SubAgentRunSnapshot, statements: SubAgentJournalStatements): Promise<SqlSubAgentJournal> {
  const json = new JsonValueContract();
  const requests = new SubAgentRequestContract(json);
  const outcomes = new ChildOutcomeContract(json);
  const contract = new SubAgentRunSnapshotContract(json,requests,outcomes);
  const codec = new JsonRecordCodec(contract,json,524288);
  const journal = new SqlSubAgentJournal(database,statements,codec,initial.scope.scopeId,initial.scope.projectId,initial.runId);
  await journal.initialize(initial);
  return journal;
}
```

### `index.ts`

Append supported child orchestration, factory, tool, outcome and SQL assembly declarations. Domain plumbing, examples and offline fixtures remain private.

```typescript
export type { SubAgentRequest } from "./agentic/subagents/SubAgentRequest";
export type { SubAgentAuthority } from "./agentic/subagents/SubAgentAuthority";
export type { AdmittedSubAgent } from "./agentic/subagents/AdmittedSubAgent";
export type { SubAgentOutcome } from "./agentic/subagents/SubAgentOutcome";
export type { SubAgentPolicyInput } from "./agentic/subagents/SubAgentPolicyInput";
export type { SubAgentPolicyDecision } from "./agentic/subagents/SubAgentPolicyDecision";
export { BoundedSubAgentPolicy } from "./agentic/subagents/BoundedSubAgentPolicy";
export { SubAgentCoordinationError } from "./errors/SubAgentCoordinationError";
export { SubAgentRequestContract } from "./agentic/subagents/SubAgentRequestContract";
export { ChildOutcomeContract } from "./agentic/subagents/ChildOutcomeContract";
export type { SubAgentClaim } from "./agentic/subagents/SubAgentClaim";
export type { SubAgentClaimOutcome } from "./agentic/subagents/SubAgentClaimOutcome";
export type { ISubAgentJournal } from "./agentic/subagents/ISubAgentJournal";
export type { ChildAgentBinding } from "./agentic/subagents/ChildAgentBinding";
export type { IAgenticUnitFactory } from "./agentic/subagents/IAgenticUnitFactory";
export type { IChildAgentBuilder } from "./agentic/subagents/IChildAgentBuilder";
export { RegisteredAgenticUnitFactory } from "./agentic/subagents/RegisteredAgenticUnitFactory";
export { SubAgentCoordinator } from "./agentic/subagents/SubAgentCoordinator";
export type { SubAgentRecord } from "./agentic/subagents/SubAgentRecord";
export type { SubAgentRunSnapshot } from "./agentic/subagents/SubAgentRunSnapshot";
export { SqlSubAgentJournal } from "./agentic/subagents/SqlSubAgentJournal";
export type { IChildSessionFactoryProvider } from "./agentic/subagents/IChildSessionFactoryProvider";
export { SessionChildAgentBuilder } from "./agentic/subagents/SessionChildAgentBuilder";
export { SubAgentArgumentsContract } from "./agentic/subagents/SubAgentArgumentsContract";
export { SpawnSubAgentTool } from "./agentic/subagents/SpawnSubAgentTool";
export { SubAgentRunSnapshotContract } from "./agentic/subagents/SubAgentRunSnapshotContract";
export type { SubAgentJournalStatements } from "./agentic/subagents/SubAgentJournalStatements";
export { sqliteSubAgentJournalStatements } from "./agentic/subagents/sqliteSubAgentJournalStatements";
export { postgresqlSubAgentJournalStatements } from "./agentic/subagents/postgresqlSubAgentJournalStatements";
```
