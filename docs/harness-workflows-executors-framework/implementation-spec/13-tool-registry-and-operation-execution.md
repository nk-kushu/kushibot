# 13. Tool Registry and Operation Execution

## What We Implement Here

Create registered tool contracts, bounded metadata, runtime argument/result validation, and a scoped dispatcher. Add durable operation claims and saved receipts so repeated delivery cannot silently repeat effects. Connect tool calls to existing budgets, cancellation, and deadlines, then demonstrate a permitted source read without exposing unrestricted filesystem access.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `tools/ToolDescriptor.ts` | `type ToolDescriptor` |
| `tools/ITool.ts` | `interface ITool` |
| `tools/RegisteredTool.ts` | `type RegisteredTool` |
| `errors/ToolOperationError.ts` | `class ToolOperationError extends Error` |
| `tools/ToolRegistry.ts` | `class ToolRegistry` |
| `tools/ToolCallRequest.ts` | `type ToolCallRequest` |
| `tools/ToolObservation.ts` | `type ToolObservation` |
| `tools/ToolDispatchOutcome.ts` | `type ToolDispatchOutcome` |
| `tools/IToolAuthorizer.ts` | `interface IToolAuthorizer` |
| `tools/operations/ToolOperationClaim.ts` | `type ToolOperationClaim` |
| `tools/operations/ToolOperationClaimResult.ts` | `type ToolOperationClaimResult` |
| `tools/operations/IToolOperationJournal.ts` | `interface IToolOperationJournal` |
| `tools/operations/ToolOperationStatements.ts` | `type ToolOperationStatements` |
| `tools/operations/sqliteToolOperationStatements.ts` | `const sqliteToolOperationStatements` |
| `tools/operations/postgresqlToolOperationStatements.ts` | `const postgresqlToolOperationStatements` |
| `tools/operations/ToolObservationContract.ts` | `class ToolObservationContract implements IResultContract<ToolObservation>` |
| `tools/operations/SqlToolOperationJournal.ts` | `class SqlToolOperationJournal implements IToolOperationJournal` |
| `tools/ToolRunResult.ts` | `type ToolRunResult` |
| `tools/BoundedToolRunner.ts` | `class BoundedToolRunner` |
| `tools/ToolDispatcher.ts` | `class ToolDispatcher` |
| `tools/source/IScopedSourceReader.ts` | `interface IScopedSourceReader` |
| `tools/source/ReadSourceArgumentsContract.ts` | `class ReadSourceArgumentsContract implements IResultContract<JsonValue>` |
| `tools/source/ReadSourceTool.ts` | `class ReadSourceTool implements ITool` |
| `tests/fakes/MemoryToolOperationJournal.ts` | `class MemoryToolOperationJournal implements IToolOperationJournal` |
| `tests/tools/checkToolDispatcher.ts` | `function checkToolDispatcher` |
| `tests/tools/IToolJournalTestHarness.ts` | `interface IToolJournalTestHarness` |
| `tests/tools/checkToolJournal.ts` | `function checkToolJournal` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [page 01](01-scope-and-implementation-roadmap.md) and [page 02](02-package-structure-and-oop-conventions.md) for general OOP, naming, file, and writing rules. Each class/interface has its own file; interfaces start with `I`. Reuse the existing JSON, validator, execution-context, SQL, usage, and control contracts. Concrete tools are registered implementations, not cases in a tool-name switch.
- This phase implements model-independent tool registration, scoped dispatch, durable operation claims, bounded waiting, and saved observation replay. It does not pretend the page-10 text gateway supports function calling. Provider-specific tool-schema translation, tool-call/result protocol items, continuation/reasoning state, and multi-turn tool conversations require explicit gateway capability extensions and contract tests before the later agentic runner can connect them. Only an actually implemented adapter may register the `tools` capability in page 12.
- Descriptions and JSON input schemas are bounded model-facing metadata. They neither validate runtime arguments nor authorize access. Every tool supplies its own input and result `IResultContract<JsonValue>` implementations. Validate bounded canonical JSON before invoking the input contract and validate its returned normalized value again. Reject unknown tools and tools excluded from the dispatcher’s immutable session allowlist. Registry registrations are trusted host capabilities, not model-created executable code.
- `ToolDispatcher` is constructed for one authenticated scope/project/workspace and budget scope. Its context’s operation ID must equal the host-generated durable request ID; provider call IDs need an explicit mapping and are not automatically trusted global operation IDs. Use a child operation identity with the session operation as parent, rather than reusing the session’s own operation ID. Context controls, allowlist, budget IDs, and authorization clients come from trusted composition. The authorizer checks current scoped permission against canonical arguments before claiming and again after admission. Actual I/O adapters still enforce the resource boundary at use time.
- `IToolAuthorizer` is an enforcement capability, not a configurable policy that can grant itself scope. General configurable recommendation policies elsewhere retain `IPolicy<TInput, TOutput>`. A permission error, invalid argument, exhausted limit, or out-of-scope path is not made retryable merely because the model asks again. A rejection on redelivery does not erase a prior saved receipt or prove that historical effects never occurred; recovery must retain existing pending references independently. Tool schemas, model output, source content, and saved observations cannot expand permissions or turn into shell instructions.
- The durable journal binds operation ID to tool ID/version, canonical arguments, workspace scope, and budget scope in `requestKey`. The reference implementation stores that bounded identity text directly; do not place credentials in tool arguments, and protect/encrypt persisted argument data under the host’s storage policy where needed. A production digested key requires a canonical cryptographic hash plus sufficient immutable provenance, not a weak ad hoc hash. Context secrets, live signals, reporters, or credentials are never serialized.
- `SqlToolOperationJournal.claim()` inserts a unique scoped operation row transactionally. Only a newly inserted owner token grants invocation. A duplicate completed claim replays the saved receipt after current validation/authorization. A duplicate pending claim returns uncertain, even if its original worker appears dead. An elapsed timeout is not proof that side effects stopped. There is no automatic lease takeover or blind replay of pending writes. Reusing an operation ID with different retained request identity is a conflict.
- `releaseBeforeDispatch()` is a narrowly trusted coordinator operation: delete only the current owner's pending claim when that owner can prove tool invocation never began. It is used for denied admission, confirmed pre-dispatch control/permission stops, or a runner that explicitly returned not-started. Never call it for an exception/timeout after invocation, invalid returned output, uncertain commit, or an unknown worker state. Keep stable request identity on command retries; release is not permission to repurpose an operation ID for another action. A settled-zero reservation also does not authorize redispatch under the same ID.
- Claim and budget accounting use separate durable transactions in this reference coordinator. A crash between them conservatively leaves a pending claim/reservation; this is deliberate fail-closed behavior, not an exactly-once external-effect guarantee. Journal completion and usage settlement are also separate. Recovery must reconcile both saved states and any adapter receipt before deciding what happened; never erase the ledger or take over a pending claim simply to make progress. The later recovery owner may provide a shared transaction/outbox protocol where both adapters support it.
- Reserve one tool call before invocation through the existing ancestor ledger. Exact reservation replay never grants a new invocation. A confirmed not-started path settles zero. Once this runner has attempted invocation, charge one call even when it throws, times out, or returns invalid output; the call count is known while external effects may remain uncertain. Additional resource dimensions such as process CPU, output bytes, or network billing need their own explicit owner/contract rather than being assumed zero or treated as the same tool-call counter.
- `BoundedToolRunner` permits one underlying invocation per instance and has no unbounded waiting queue. It links cancellation to an abort signal and bounds caller wait by the earlier configured timeout/deadline. An ignored abort keeps that runner occupied until the underlying promise settles. A timeout/exception returns uncertain, not proof that a file write rolled back. Synchronous blocking code cannot be interrupted by a timer; adapters needing hard termination must own a separate process and enforce its lifecycle. Bound total runner/session instances through admission.
- Concrete tools must enforce I/O/output bounds while producing data. The dispatcher’s final JSON byte check is a second defense and cannot undo memory already allocated by a bad implementation. Large reports go into authorized artifacts with bounded references; do not silently truncate required evidence or represent unsaved data as an artifact. Tool observations remain untrusted source material when included in a later prompt. They are not instructions, task acceptance, test truth beyond their actual receipt, or publication approval.
- On a valid returned value, settle the known call, validate bounded output, save the owner-bound receipt, and only then return a completed observation. A persistence failure remains observable; do not claim a durable receipt was saved. If an output is malformed or too large after invocation, preserve the operation as uncertain because effects may already have happened. Completed receipt replay is idempotent, but changes to current permissions or schema/version can reject replay before exposing saved content.
- A completed tool observation describes that tool operation only. It can arrive after cancellation/deadline; the caller must preserve it as collected work and recheck controls before continuing or accepting a larger task result. Uncertain outcomes contribute their operation ID to `pendingOperationRefs` in a stopped/failed partial outcome and checkpoint. Do not automatically call a model again to explain an exhausted tool allowance.
- The journal is scoped by project/scope, with workspace identity bound into its immutable request key. Its version-1 table uses the page-06 pinned-transaction and cross-worker migration-lock contract. Add explicit versioned migrations/compatibility checks before incompatible changes; `CREATE TABLE IF NOT EXISTS` is not a migration system. Keep receipt retention long enough to preserve replay protection, and do not delete completed receipts as an arbitrary cleanup shortcut.
- `ReadSourceTool` demonstrates `source:...` reference input and an injected `IScopedSourceReader`, not direct unrestricted filesystem access. The actual reader must resolve authorized source references, enforce roots/symlink boundaries, check current scope, abort cooperatively, and bound bytes while reading. `source:...` syntax alone proves no authorization. Its result is plain bounded JSON, not a permission to execute file contents. General workspace/path capabilities and sequential editing are implemented in page 14; no write tool is supplied here.
- Editing tools need explicitly permitted file scopes plus the shared workspace editing gate or isolation. Two child sessions writing `login.ts` are not safe merely because their journals use different operation IDs. Use sequential editing by default. Network tools, checks, shell processes, publication, and external messages each need their own authorized adapters; registering a generic tool does not authorize every external effect.
- Required journal/usage receipts survive optional debug disablement. The bounded safe recorder may record configured tool/version IDs, duration, safe status codes, and authorized receipt references, never raw argument values, source contents, output bodies, private reasoning, or credentials. Add explicit event-specific schemas before introducing new tool event names.
- Offline checks cover argument/permission denial without invocation, call exhaustion, deadline/cancellation boundaries, output validation, exact saved replay without repeated effects or charges, pending duplicate delivery, conflicting identity, and an ignored abort occupying a runner. Real SQL adapter acceptance must additionally demonstrate competing claims, owner-token enforcement, rollback, exact completion retry, close/reopen receipt replay, scope isolation, and unknown-commit handling on SQLite and PostgreSQL. In-memory fakes are deterministic examples and do not establish those database guarantees.

## TypeScript Code for Each File

### `tools/ToolDescriptor.ts`

Describes the registered operation and its bounded input/output contracts; schema metadata is not authorization.

```typescript
import type { JsonValue } from "../contracts/persistence/JsonValue";
export type ToolDescriptor = Readonly<{ id: string; version: string; description: string; inputSchema: JsonValue; maxArgumentBytes: number; maxOutputBytes: number }>;
```

### `tools/ITool.ts`

Defines one injected capability with separate runtime validators for untrusted arguments and returned data.

```typescript
import type { ToolDescriptor } from "./ToolDescriptor";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export interface ITool {
  readonly descriptor: ToolDescriptor;
  readonly argumentsContract: IResultContract<JsonValue>;
  readonly resultContract: IResultContract<JsonValue>;
  execute(argumentsValue: JsonValue, context: IExecutionContext): Promise<unknown>;
}
```

### `tools/RegisteredTool.ts`

Keeps an immutable descriptor snapshot separate from the injected executable object.

```typescript
import type { ToolDescriptor } from "./ToolDescriptor";
import type { ITool } from "./ITool";
export type RegisteredTool = Readonly<{ descriptor: ToolDescriptor; implementation: ITool }>;
```

### `errors/ToolOperationError.ts`

Reports invalid configuration, conflicting identity, or invalid durable operation state using safe fixed codes.

```typescript
export class ToolOperationError extends Error {
  readonly code = "TOOL_OPERATION_INVALID";
  constructor() { super("Tool registration, operation identity, or journal state is invalid."); this.name = "ToolOperationError"; }
}
```

### `tools/ToolRegistry.ts`

Registers validated immutable metadata and resolves implementations without a tool-name switch.

```typescript
import type { ITool } from "./ITool";
import type { RegisteredTool } from "./RegisteredTool";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ToolOperationError } from "../errors/ToolOperationError";
export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();
  constructor(private readonly json: JsonValueContract) {}
  async register(tool: ITool): Promise<void> {
    const d = { ...tool.descriptor };
    if (!/^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(d.id) || !/^[a-zA-Z0-9_.-]{1,32}$/.test(d.version) ||
        typeof d.description !== "string" || new TextEncoder().encode(d.description).byteLength > 1024 ||
        ![d.maxArgumentBytes, d.maxOutputBytes].every(value => Number.isSafeInteger(value) && value > 0 && value <= 65536)) throw new ToolOperationError();
    const schema = await this.json.validate(d.inputSchema);
    if (!schema.valid || new TextEncoder().encode(JSON.stringify(schema.value)).byteLength > 8192) throw new ToolOperationError();
    // Recheck after await so concurrent registration cannot overwrite an existing tool.
    if (this.tools.has(d.id) || this.tools.size >= 64) throw new ToolOperationError();
    this.tools.set(d.id, Object.freeze({ descriptor: Object.freeze({ id: d.id, version: d.version, description: d.description,
      inputSchema: schema.value, maxArgumentBytes: d.maxArgumentBytes, maxOutputBytes: d.maxOutputBytes }), implementation: tool }));
  }
  resolve(id: string): RegisteredTool | null { return this.tools.get(id) ?? null; }
  describe(ids: readonly string[]): readonly RegisteredTool["descriptor"][] {
    return Object.freeze(ids.map(id => { const tool = this.tools.get(id); if (tool === undefined) throw new ToolOperationError(); return tool.descriptor; }));
  }
}
```

### `tools/ToolCallRequest.ts`

Separates the host’s durable operation ID from untrusted model-supplied argument data.

```typescript
export type ToolCallRequest = Readonly<{ operationId: string; toolId: string; arguments: unknown }>;
```

### `tools/ToolObservation.ts`

Stores only a validated bounded returned value; it is an observation, not proof of task completion.

```typescript
import type { JsonValue } from "../contracts/persistence/JsonValue";
export type ToolObservation = Readonly<{ operationId: string; toolId: string; toolVersion: string; value: JsonValue }>;
```

### `tools/ToolDispatchOutcome.ts`

Distinguishes replayed/saved observations, pre-dispatch rejection, control stops, and uncertain effects.

```typescript
import type { ToolObservation } from "./ToolObservation";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason";
export type ToolDispatchOutcome =
  | Readonly<{ status: "completed"; observation: ToolObservation; replayed: boolean }>
  | Readonly<{ status: "rejected"; code: string }>
  | Readonly<{ status: "stopped"; reason: ExecutionStopReason }>
  | Readonly<{ status: "uncertain"; operationId: string }>;
```

### `tools/IToolAuthorizer.ts`

Checks current scoped permission against trusted execution context and validated arguments, separately from schema metadata.

```typescript
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { ToolDescriptor } from "./ToolDescriptor";
export interface IToolAuthorizer { authorize(tool: ToolDescriptor, args: JsonValue, context: IExecutionContext): Promise<boolean>; }
```

### `tools/operations/ToolOperationClaim.ts`

Binds one immutable request identity to a unique claim token; it contains no live context or credentials.

```typescript
export type ToolOperationClaim = Readonly<{ operationId: string; requestKey: string; ownerToken: string }>;
```

### `tools/operations/ToolOperationClaimResult.ts`

Grants execution only on a newly inserted claim; pending duplicate delivery never grants a second dispatch.

```typescript
import type { ToolObservation } from "../ToolObservation";
export type ToolOperationClaimResult =
  | Readonly<{ kind: "acquired" }>
  | Readonly<{ kind: "pending" }>
  | Readonly<{ kind: "completed"; observation: ToolObservation }>;
```

### `tools/operations/IToolOperationJournal.ts`

Defines durable claim and completed-receipt storage under one authenticated scope/project.

```typescript
import type { ToolOperationClaim } from "./ToolOperationClaim";
import type { ToolOperationClaimResult } from "./ToolOperationClaimResult";
import type { ToolObservation } from "../ToolObservation";
export interface IToolOperationJournal {
  initialize(): Promise<void>;
  claim(command: ToolOperationClaim): Promise<ToolOperationClaimResult>;
  releaseBeforeDispatch(command: ToolOperationClaim): Promise<void>;
  complete(command: ToolOperationClaim, observation: ToolObservation): Promise<void>;
}
```

### `tools/operations/ToolOperationStatements.ts`

Carries backend-specific SQL as fixed injected data; scope and operation values are always bound parameters.

```typescript
export type ToolOperationStatements = Readonly<{ schema: string; insert: string; read: string; finish: string; release: string }>;
```

### `tools/operations/sqliteToolOperationStatements.ts`

Defines the sqlite atomic claim and owner-bound completion statements for the version-1 operation table.

```typescript
import type { ToolOperationStatements } from "./ToolOperationStatements";
export const sqliteToolOperationStatements: ToolOperationStatements = Object.freeze({
  "schema": "CREATE TABLE IF NOT EXISTS kushibot_tool_operations_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, operation_id TEXT NOT NULL, request_key TEXT NOT NULL, owner_token TEXT NOT NULL, status TEXT NOT NULL, payload TEXT, PRIMARY KEY (scope_id, project_id, operation_id))",
  "insert": "INSERT INTO kushibot_tool_operations_v1 (scope_id, project_id, operation_id, request_key, owner_token, status, payload) VALUES (?, ?, ?, ?, ?, 'pending', NULL) ON CONFLICT DO NOTHING",
  "read": "SELECT request_key, owner_token, status, payload FROM kushibot_tool_operations_v1 WHERE scope_id = ? AND project_id = ? AND operation_id = ?",
  "finish": "UPDATE kushibot_tool_operations_v1 SET status = 'completed', payload = ? WHERE scope_id = ? AND project_id = ? AND operation_id = ? AND request_key = ? AND owner_token = ? AND status = 'pending'" ,
  "release": "DELETE FROM kushibot_tool_operations_v1 WHERE scope_id = ? AND project_id = ? AND operation_id = ? AND request_key = ? AND owner_token = ? AND status = 'pending'"
});
```

### `tools/operations/postgresqlToolOperationStatements.ts`

Defines the postgresql atomic claim and owner-bound completion statements for the version-1 operation table.

```typescript
import type { ToolOperationStatements } from "./ToolOperationStatements";
export const postgresqlToolOperationStatements: ToolOperationStatements = Object.freeze({
  "schema": "CREATE TABLE IF NOT EXISTS kushibot_tool_operations_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, operation_id TEXT NOT NULL, request_key TEXT NOT NULL, owner_token TEXT NOT NULL, status TEXT NOT NULL, payload TEXT, PRIMARY KEY (scope_id, project_id, operation_id))",
  "insert": "INSERT INTO kushibot_tool_operations_v1 (scope_id, project_id, operation_id, request_key, owner_token, status, payload) VALUES ($1, $2, $3, $4, $5, 'pending', NULL) ON CONFLICT DO NOTHING",
  "read": "SELECT request_key, owner_token, status, payload FROM kushibot_tool_operations_v1 WHERE scope_id = $1 AND project_id = $2 AND operation_id = $3",
  "finish": "UPDATE kushibot_tool_operations_v1 SET status = 'completed', payload = $1 WHERE scope_id = $2 AND project_id = $3 AND operation_id = $4 AND request_key = $5 AND owner_token = $6 AND status = 'pending'" ,
  "release": "DELETE FROM kushibot_tool_operations_v1 WHERE scope_id = $1 AND project_id = $2 AND operation_id = $3 AND request_key = $4 AND owner_token = $5 AND status = 'pending'"
});
```

### `tools/operations/ToolObservationContract.ts`

Validates persisted receipt envelopes and bounded JSON data before returning a replayed observation.

```typescript
import type { IResultContract } from "../../contracts/validation/IResultContract";
import type { ValidationResult } from "../../contracts/validation/ValidationResult";
import type { ToolObservation } from "../ToolObservation";
import { JsonValueContract } from "../../persistence/JsonValueContract";
export class ToolObservationContract implements IResultContract<ToolObservation> {
  readonly id = "tool-observation"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(input: unknown): Promise<ValidationResult<ToolObservation>> {
    const checked = await this.json.validate(input);
    if (!checked.valid) return { valid: false, issues: checked.issues };
    const value = checked.value;
    if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== "operationId,toolId,toolVersion,value") return this.invalid();
    const data = value as Record<string, unknown>;
    if (typeof data.operationId !== "string" || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(data.operationId) || typeof data.toolId !== "string" || !/^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(data.toolId) ||
        typeof data.toolVersion !== "string" || !/^[a-zA-Z0-9_.-]{1,32}$/.test(data.toolVersion) || new TextEncoder().encode(JSON.stringify(data.value)).byteLength > 65536) return this.invalid();
    return { valid: true, value: value as unknown as ToolObservation };
  }
  private invalid(): ValidationResult<ToolObservation> { return { valid: false, issues: [{ path: [], code: "invalid-tool-observation", message: "Tool observation receipt is invalid." }] }; }
}
```

### `tools/operations/SqlToolOperationJournal.ts`

Uses unique durable claims and owner-bound receipts to prevent duplicate dispatch; pending claims require reconciliation, not takeover.

```typescript
import type { IToolOperationJournal } from "./IToolOperationJournal";
import type { ToolOperationStatements } from "./ToolOperationStatements";
import type { ToolOperationClaim } from "./ToolOperationClaim";
import type { ToolOperationClaimResult } from "./ToolOperationClaimResult";
import type { ToolObservation } from "../ToolObservation";
import type { ISqlDatabase } from "../../persistence/sql/ISqlDatabase";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import { ToolOperationError } from "../../errors/ToolOperationError";
export class SqlToolOperationJournal implements IToolOperationJournal {
  private readonly scopeKey: readonly string[];
  constructor(private readonly db: ISqlDatabase, private readonly sql: ToolOperationStatements,
    scope: ExecutionScopeRef, private readonly codec: IRecordCodec<ToolObservation>) { this.scopeKey = Object.freeze([scope.scopeId, scope.projectId]); }
  async initialize(): Promise<void> { await this.db.migrationTransaction(async tx => { await tx.query(this.sql.schema, []); }); }
  async claim(command: ToolOperationClaim): Promise<ToolOperationClaimResult> {
    this.validate(command);
    return this.db.transaction(async tx => {
      const inserted = await tx.query(this.sql.insert, [...this.scopeKey, command.operationId, command.requestKey, command.ownerToken]);
      if (inserted.affectedRows === 1) return { kind: "acquired" };
      const result = await tx.query(this.sql.read, [...this.scopeKey, command.operationId]); const row = result.rows[0];
      if (result.rows.length !== 1 || row.request_key !== command.requestKey || typeof row.owner_token !== "string") throw new ToolOperationError();
      if (row.status === "pending" && row.payload === null) return { kind: "pending" };
      if (row.status !== "completed" || typeof row.payload !== "string") throw new ToolOperationError();
      const observation = await this.codec.decode(row.payload);
      if (observation.operationId !== command.operationId) throw new ToolOperationError();
      return { kind: "completed", observation };
    });
  }
  async complete(command: ToolOperationClaim, observation: ToolObservation): Promise<void> {
    this.validate(command);
    if (observation.operationId !== command.operationId) throw new ToolOperationError();
    const payload = await this.codec.encode(observation);
    await this.db.transaction(async tx => {
      const result = await tx.query(this.sql.finish, [payload, ...this.scopeKey, command.operationId, command.requestKey, command.ownerToken]);
      if (result.affectedRows === 1) return;
      const old = await tx.query(this.sql.read, [...this.scopeKey, command.operationId]); const row = old.rows[0];
      if (old.rows.length !== 1 || row.request_key !== command.requestKey || row.owner_token !== command.ownerToken || row.status !== "completed" || row.payload !== payload) throw new ToolOperationError();
    });
  }
  async releaseBeforeDispatch(command: ToolOperationClaim): Promise<void> {
    this.validate(command);
    await this.db.transaction(async tx => {
      const result = await tx.query(this.sql.release, [...this.scopeKey, command.operationId, command.requestKey, command.ownerToken]);
      if (result.affectedRows !== 1) throw new ToolOperationError();
    });
  }
  private validate(value: ToolOperationClaim): void {
    if (![value.operationId, value.ownerToken].every(id => /^[a-zA-Z0-9_.:-]{1,128}$/.test(id)) || typeof value.requestKey !== "string" || new TextEncoder().encode(value.requestKey).byteLength > 70000) throw new ToolOperationError();
  }
}
```

### `tools/ToolRunResult.ts`

Distinguishes an invocation that definitely did not start from a returned value or uncertain attempted operation.

```typescript
export type ToolRunResult =
  | Readonly<{ kind: "not-started" }>
  | Readonly<{ kind: "returned"; value: unknown }>
  | Readonly<{ kind: "uncertain" }>;
```

### `tools/BoundedToolRunner.ts`

Bounds caller wait and permits one unresolved invocation per runner; aborting does not falsely claim an external effect was undone.

```typescript
import type { ITool } from "./ITool";
import type { ToolRunResult } from "./ToolRunResult";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { IClock } from "../contracts/runtime/IClock";
import { ToolOperationError } from "../errors/ToolOperationError";
export class BoundedToolRunner {
  private active = false;
  constructor(private readonly clock: IClock) {}
  async run(tool: ITool, args: JsonValue, context: IExecutionContext, timeoutMs: number): Promise<ToolRunResult> {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647) throw new ToolOperationError();
    const now = this.clock.nowEpochMs();
    if (!Number.isSafeInteger(now) || now < 0) throw new ToolOperationError();
    if (this.active || context.signal.aborted || (context.deadlineEpochMs !== null && now >= context.deadlineEpochMs)) return { kind: "not-started" };
    this.active = true; const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined; let cancel = () => {};
    try {
      const cancelled = new Promise<ToolRunResult>(resolve => { cancel = () => { abort.abort(); resolve({ kind: "uncertain" }); }; context.signal.addEventListener("abort", cancel, { once: true }); });
      const bound = Math.min(timeoutMs, context.deadlineEpochMs === null ? timeoutMs : context.deadlineEpochMs - now);
      const timeout = new Promise<ToolRunResult>(resolve => { timer = setTimeout(() => { abort.abort(); resolve({ kind: "uncertain" }); }, bound); });
      const operation = Promise.resolve().then(() => tool.execute(args, Object.freeze({ ...context, signal: abort.signal }))).then<ToolRunResult, ToolRunResult>(
        value => ({ kind: "returned", value }), () => ({ kind: "uncertain" }));
      void operation.then(() => { this.active = false; }, () => { this.active = false; });
      return await Promise.race([operation, cancelled, timeout]);
    } finally { if (timer !== undefined) clearTimeout(timer); context.signal.removeEventListener("abort", cancel); }
  }
}
```

### `tools/ToolDispatcher.ts`

Coordinates validated scoped tool dispatch, durable ownership, one tool-call reservation, bounded execution, and saved receipt replay.

```typescript
import type { ToolCallRequest } from "./ToolCallRequest";
import type { ToolDispatchOutcome } from "./ToolDispatchOutcome";
import type { IToolAuthorizer } from "./IToolAuthorizer";
import type { IToolOperationJournal } from "./operations/IToolOperationJournal";
import type { IUsageLedgerStore } from "../usage/IUsageLedgerStore";
import type { IClock } from "../contracts/runtime/IClock";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import { ToolOperationError } from "../errors/ToolOperationError";
import { ToolRegistry } from "./ToolRegistry";
import { BoundedToolRunner } from "./BoundedToolRunner";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { JsonRecordCodec } from "../persistence/JsonRecordCodec";
import { zeroUsage } from "../usage/zeroUsage";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
export class ToolDispatcher {
  private readonly allowed: ReadonlySet<string>;
  private readonly scope: ExecutionScopeRef;
  constructor(private readonly registry: ToolRegistry, private readonly authorizer: IToolAuthorizer,
    private readonly journal: IToolOperationJournal, private readonly ledger: IUsageLedgerStore,
    private readonly budgetScopeId: string, scope: ExecutionScopeRef, allowedToolIds: readonly string[],
    private readonly clock: IClock, private readonly ids: IIdGenerator, private readonly runner: BoundedToolRunner,
    private readonly json: JsonValueContract, private readonly timeoutMs: number) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647 || allowedToolIds.length > 64) throw new ToolOperationError();
    this.allowed = new Set(allowedToolIds); this.scope = Object.freeze({ ...scope });
  }
  async dispatch(request: ToolCallRequest, context: IExecutionContext): Promise<ToolDispatchOutcome> {
    request = Object.freeze({ ...request });
    context = Object.freeze({ ...context, identity: Object.freeze({ ...context.identity }), scope: Object.freeze({ ...context.scope }) });
    if (!/^[a-zA-Z0-9_.:-]{1,128}$/.test(request.operationId) || request.operationId !== context.identity.operationId ||
        context.scope.scopeId !== this.scope.scopeId || context.scope.projectId !== this.scope.projectId || context.scope.workspaceId !== this.scope.workspaceId) return { status: "rejected", code: "TOOL_SCOPE_OR_ID_INVALID" };
    const registered = this.registry.resolve(request.toolId);
    if (registered === null || !this.allowed.has(request.toolId)) return { status: "rejected", code: "TOOL_NOT_AVAILABLE" };
    const guard = new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs);
    const initial = guard.check(); if (initial !== null) return { status: "stopped", reason: initial };
    const { descriptor, implementation } = registered;
    const argsCodec = new JsonRecordCodec(this.json, this.json, descriptor.maxArgumentBytes);
    let raw;
    try { raw = await argsCodec.decode(await argsCodec.encode(request.arguments)); }
    catch { return { status: "rejected", code: "TOOL_ARGUMENTS_INVALID" }; }
    const args = await implementation.argumentsContract.validate(raw);
    if (!args.valid) return { status: "rejected", code: "TOOL_ARGUMENTS_INVALID" };
    const canonicalArgs = await argsCodec.decode(await argsCodec.encode(args.value));
    if (!await this.authorizer.authorize(descriptor, canonicalArgs, context)) return { status: "rejected", code: "TOOL_FORBIDDEN" };
    const beforeClaim = guard.check(); if (beforeClaim !== null) return { status: "stopped", reason: beforeClaim };
    const command = Object.freeze({ operationId: request.operationId, ownerToken: this.ids.nextId(),
      requestKey: JSON.stringify({ toolId: descriptor.id, version: descriptor.version, scope: this.scope, budgetScopeId: this.budgetScopeId, arguments: canonicalArgs }) });
    const claim = await this.journal.claim(command);
    if (claim.kind === "pending") return { status: "uncertain", operationId: request.operationId };
    if (claim.kind === "completed") {
      if (claim.observation.toolId !== descriptor.id || claim.observation.toolVersion !== descriptor.version) return { status: "uncertain", operationId: request.operationId };
      const savedCodec = new JsonRecordCodec(implementation.resultContract, this.json, descriptor.maxOutputBytes);
      try {
        const value = await savedCodec.decode(await savedCodec.encode(claim.observation.value));
        return { status: "completed", observation: Object.freeze({ ...claim.observation, value }), replayed: true };
      } catch { return { status: "rejected", code: "TOOL_RECEIPT_INCOMPATIBLE" }; }
    }
    const reservation = await this.ledger.mutate(ledger => ledger.reserve(request.operationId, this.budgetScopeId, { ...zeroUsage, toolCalls: 1 }));
    if (!reservation.admitted) {
      await this.journal.releaseBeforeDispatch(command);
      return { status: "stopped", reason: { code: "limit-reached", message: "Tool-call allowance unavailable." } };
    }
    if (reservation.replayed) return { status: "uncertain", operationId: request.operationId };
    // Recheck permission after asynchronous admission; the adapter must still enforce the actual resource boundary.
    const stop = guard.check();
    if (stop !== null || !await this.authorizer.authorize(descriptor, canonicalArgs, context)) {
      await this.ledger.mutate(ledger => ledger.settle(request.operationId, zeroUsage));
      await this.journal.releaseBeforeDispatch(command);
      return stop === null ? { status: "rejected", code: "TOOL_FORBIDDEN" } : { status: "stopped", reason: stop };
    }
    const run = await this.runner.run(implementation, canonicalArgs, context, this.timeoutMs);
    if (run.kind === "not-started") {
      await this.ledger.mutate(ledger => ledger.settle(request.operationId, zeroUsage));
      await this.journal.releaseBeforeDispatch(command);
      const reason = guard.check();
      return reason === null ? { status: "rejected", code: "TOOL_RUNNER_BUSY" } : { status: "stopped", reason };
    }
    // Invocation count is known even if the operation's effects or output are uncertain.
    await this.ledger.mutate(ledger => ledger.settle(request.operationId, { ...zeroUsage, toolCalls: 1 }));
    if (run.kind === "uncertain") return { status: "uncertain", operationId: request.operationId };
    const outputCodec = new JsonRecordCodec(implementation.resultContract, this.json, descriptor.maxOutputBytes);
    let value;
    try { value = await outputCodec.decode(await outputCodec.encode(run.value)); }
    catch { return { status: "uncertain", operationId: request.operationId }; }
    const observation = Object.freeze({ operationId: request.operationId, toolId: descriptor.id, toolVersion: descriptor.version, value });
    await this.journal.complete(command, observation);
    // A received/saved observation may arrive after cancellation; the caller must check controls before continuing.
    return { status: "completed", observation, replayed: false };
  }
}
```

### `tools/source/IScopedSourceReader.ts`

Requires an injected source capability to authorize the reference and bound bytes while reading, before allocating an oversized result.

```typescript
export interface IScopedSourceReader { read(sourceRef: string, maxBytes: number, signal: AbortSignal): Promise<string>; }
```

### `tools/source/ReadSourceArgumentsContract.ts`

Accepts an exact source-reference/byte-bound object; no arbitrary filesystem path or shell command is accepted.

```typescript
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { IResultContract } from "../../contracts/validation/IResultContract";
import type { ValidationResult } from "../../contracts/validation/ValidationResult";
export class ReadSourceArgumentsContract implements IResultContract<JsonValue> {
  readonly id = "read-source-arguments"; readonly version = "1";
  async validate(value: unknown): Promise<ValidationResult<JsonValue>> {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const data = value as Record<string, unknown>;
      if (Object.keys(data).sort().join(",") === "maxBytes,sourceRef" && typeof data.sourceRef === "string" && /^source:[a-zA-Z0-9_.:/-]{1,128}$/.test(data.sourceRef) &&
          typeof data.maxBytes === "number" && Number.isSafeInteger(data.maxBytes) && data.maxBytes >= 1 && data.maxBytes <= 8192) {
        return { valid: true, value: Object.freeze({ sourceRef: data.sourceRef, maxBytes: data.maxBytes }) };
      }
    }
    return { valid: false, issues: [{ path: [], code: "invalid-source-read", message: "Source reference or read bound is invalid." }] };
  }
}
```

### `tools/source/ReadSourceTool.ts`

Demonstrates a read capability with validated arguments and injected scoped I/O; the workspace owner supplies the actual reader.

```typescript
import type { ITool } from "../ITool";
import type { ToolDescriptor } from "../ToolDescriptor";
import type { IScopedSourceReader } from "./IScopedSourceReader";
import type { JsonValue } from "../../contracts/persistence/JsonValue";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import { ReadSourceArgumentsContract } from "./ReadSourceArgumentsContract";
import { JsonValueContract } from "../../persistence/JsonValueContract";
import { ToolOperationError } from "../../errors/ToolOperationError";
export class ReadSourceTool implements ITool {
  readonly descriptor: ToolDescriptor = Object.freeze({ id: "read-source", version: "1", description: "Read a permitted source reference within a byte bound.", maxArgumentBytes: 1024, maxOutputBytes: 60000,
    inputSchema: Object.freeze({ type: "object", additionalProperties: false, required: ["sourceRef", "maxBytes"], properties: { sourceRef: { type: "string" }, maxBytes: { type: "integer", minimum: 1, maximum: 8192 } } }) });
  readonly argumentsContract = new ReadSourceArgumentsContract();
  readonly resultContract = new JsonValueContract();
  constructor(private readonly reader: IScopedSourceReader) {}
  async execute(args: JsonValue, context: IExecutionContext): Promise<unknown> {
    const checked = await this.argumentsContract.validate(args);
    if (!checked.valid) throw new ToolOperationError();
    const value = checked.value as Readonly<{ sourceRef: string; maxBytes: number }>;
    const text = await this.reader.read(value.sourceRef, value.maxBytes, context.signal);
    if (typeof text !== "string" || new TextEncoder().encode(text).byteLength > value.maxBytes) throw new ToolOperationError();
    return { sourceRef: value.sourceRef, text };
  }
}
```

### `tests/fakes/MemoryToolOperationJournal.ts`

Provides a deterministic test-only claim store; it does not establish process recovery or shared-database guarantees.

```typescript
import type { IToolOperationJournal } from "../../tools/operations/IToolOperationJournal";
import type { ToolOperationClaim } from "../../tools/operations/ToolOperationClaim";
import type { ToolOperationClaimResult } from "../../tools/operations/ToolOperationClaimResult";
import type { ToolObservation } from "../../tools/ToolObservation";
import { ToolOperationError } from "../../errors/ToolOperationError";
export class MemoryToolOperationJournal implements IToolOperationJournal {
  private readonly entries = new Map<string, Readonly<{ claim: ToolOperationClaim; observation: ToolObservation | null }>>();
  async initialize(): Promise<void> {}
  async claim(command: ToolOperationClaim): Promise<ToolOperationClaimResult> {
    const old = this.entries.get(command.operationId);
    if (old === undefined) { this.entries.set(command.operationId, { claim: command, observation: null }); return { kind: "acquired" }; }
    if (old.claim.requestKey !== command.requestKey) throw new ToolOperationError();
    return old.observation === null ? { kind: "pending" } : { kind: "completed", observation: old.observation };
  }
  async complete(command: ToolOperationClaim, observation: ToolObservation): Promise<void> {
    const old = this.entries.get(command.operationId);
    if (old === undefined || old.claim.ownerToken !== command.ownerToken || old.claim.requestKey !== command.requestKey) throw new ToolOperationError();
    if (old.observation !== null && JSON.stringify(old.observation) !== JSON.stringify(observation)) throw new ToolOperationError();
    this.entries.set(command.operationId, { claim: command, observation });
  }
  async releaseBeforeDispatch(command: ToolOperationClaim): Promise<void> {
    const old = this.entries.get(command.operationId);
    if (old === undefined || old.claim.ownerToken !== command.ownerToken || old.claim.requestKey !== command.requestKey || old.observation !== null) throw new ToolOperationError();
    this.entries.delete(command.operationId);
  }
}
```

### `tests/tools/checkToolDispatcher.ts`

Checks argument rejection, permission denial, saved replay without re-reading or double-charging, and expired controls.

```typescript
import { ToolRegistry } from "../../tools/ToolRegistry";
import { ToolDispatcher } from "../../tools/ToolDispatcher";
import { BoundedToolRunner } from "../../tools/BoundedToolRunner";
import { ReadSourceTool } from "../../tools/source/ReadSourceTool";
import { JsonValueContract } from "../../persistence/JsonValueContract";
import { MemoryToolOperationJournal } from "../fakes/MemoryToolOperationJournal";
import { UsageLedger } from "../../usage/UsageLedger";
import { zeroUsage } from "../../usage/zeroUsage";
export async function checkToolDispatcher(): Promise<void> {
  const json = new JsonValueContract(); const registry = new ToolRegistry(json); let reads = 0;
  await registry.register(new ReadSourceTool({ async read() { reads++; return "export const login = true;"; } }));
  const ledger = new UsageLedger({ schemaVersion: 1, scopes: [{ id: "run", parentId: null, limits: { ...zeroUsage, toolCalls: 1 } }], reservations: [] });
  const store = { async initialize() {}, async read() { return ledger.snapshot(); }, async mutate<T>(change: (value: UsageLedger) => T) { return change(ledger); } };
  const scope = { scopeId: "scope", projectId: "project" }; const clock = { nowEpochMs: () => 100 }; let id = 0;
  let permitted = true;
  const dispatcher = new ToolDispatcher(registry, { async authorize() { return permitted; } }, new MemoryToolOperationJournal(), store, "run", scope, ["read-source"], clock, { nextId: () => `claim-${++id}` }, new BoundedToolRunner(clock), json, 100);
  const context = { identity: { operationId: "read-one" }, scope, signal: new AbortController().signal, deadlineEpochMs: 1000, reporter: { async progress() {} } };
  const request = { operationId: "read-one", toolId: "read-source", arguments: { sourceRef: "source:login.ts", maxBytes: 1024 } };
  if ((await dispatcher.dispatch({ ...request, arguments: { path: "/outside" } }, context)).status !== "rejected" || reads !== 0) throw new Error("Invalid arguments dispatched.");
  permitted = false;
  if ((await dispatcher.dispatch(request, context)).status !== "rejected" || reads !== 0) throw new Error("Forbidden tool dispatched.");
  permitted = true;
  const first = await dispatcher.dispatch(request, context); const replay = await dispatcher.dispatch(request, context);
  if (first.status !== "completed" || first.replayed || replay.status !== "completed" || !replay.replayed || Number(reads) !== 1 || ledger.totals("run").consumed.toolCalls !== 1) throw new Error("Replay repeated execution or charge.");
  const denied = await dispatcher.dispatch({ ...request, operationId: "read-two" }, { ...context, identity: { operationId: "read-two" } });
  if (denied.status !== "stopped" || Number(reads) !== 1) throw new Error("Exhausted allowance dispatched.");
  if ((await dispatcher.dispatch(request, { ...context, deadlineEpochMs: 100 })).status !== "stopped") throw new Error("Expired deadline ignored.");
}
```

### `tests/tools/IToolJournalTestHarness.ts`

Supplies disposable real-backend journal bindings; close/reopen must retain the same database contents.

```typescript
import type { IToolOperationJournal } from "../../tools/operations/IToolOperationJournal";
export interface IToolJournalTestHarness {
  open(scopeId: string): Promise<IToolOperationJournal>;
  close(): Promise<void>;
}
```

### `tests/tools/checkToolJournal.ts`

Runs the same durable-claim acceptance check against each real SQL binding, including competing owners and restart replay.

```typescript
import type { IToolJournalTestHarness } from "./IToolJournalTestHarness";
export async function checkToolJournal(harness: IToolJournalTestHarness): Promise<void> {
  let journal = await harness.open("journal-main"); await journal.initialize();
  const first = { operationId: "read-one", requestKey: "fixture-request-v1", ownerToken: "owner-one" };
  const second = { ...first, ownerToken: "owner-two" };
  const claims = await Promise.all([journal.claim(first), journal.claim(second)]);
  if (claims.filter(value => value.kind === "acquired").length !== 1 || claims.filter(value => value.kind === "pending").length !== 1) throw new Error("Competing claims both acquired execution.");
  const owner = claims[0].kind === "acquired" ? first : second;
  const observation = { operationId: "read-one", toolId: "read-source", toolVersion: "1", value: { sourceRef: "source:login.ts", text: "fixture" } };
  await journal.complete(owner, observation); await journal.complete(owner, observation);
  if ((await journal.claim(second)).kind !== "completed") throw new Error("Saved receipt not replayed.");
  let rejected = false;
  try { await journal.claim({ ...first, requestKey: "different-request" }); } catch { rejected = true; }
  if (!rejected) throw new Error("Conflicting operation identity accepted.");
  const other = await harness.open("journal-other"); await other.initialize();
  if ((await other.claim(first)).kind !== "acquired") throw new Error("Journal scopes leaked.");
  await harness.close(); journal = await harness.open("journal-main"); await journal.initialize();
  if ((await journal.claim(first)).kind !== "completed") throw new Error("Restart lost completed receipt.");
  const unused = { operationId: "not-started", requestKey: "unused-fixture", ownerToken: "unused-owner" };
  await journal.claim(unused); await journal.releaseBeforeDispatch(unused);
  if ((await journal.claim(unused)).kind !== "acquired") throw new Error("Proven non-dispatch release failed.");
  await harness.close();
}
```

### `index.ts`

Appends the production tool and operation API without exporting test fakes.

```typescript
export type { ToolDescriptor } from "./tools/ToolDescriptor";
export type { ITool } from "./tools/ITool";
export type { RegisteredTool } from "./tools/RegisteredTool";
export { ToolOperationError } from "./errors/ToolOperationError";
export { ToolRegistry } from "./tools/ToolRegistry";
export type { ToolCallRequest } from "./tools/ToolCallRequest";
export type { ToolObservation } from "./tools/ToolObservation";
export type { ToolDispatchOutcome } from "./tools/ToolDispatchOutcome";
export type { IToolAuthorizer } from "./tools/IToolAuthorizer";
export type { ToolOperationClaim } from "./tools/operations/ToolOperationClaim";
export type { ToolOperationClaimResult } from "./tools/operations/ToolOperationClaimResult";
export type { IToolOperationJournal } from "./tools/operations/IToolOperationJournal";
export type { ToolOperationStatements } from "./tools/operations/ToolOperationStatements";
export { sqliteToolOperationStatements } from "./tools/operations/sqliteToolOperationStatements";
export { postgresqlToolOperationStatements } from "./tools/operations/postgresqlToolOperationStatements";
export { ToolObservationContract } from "./tools/operations/ToolObservationContract";
export { SqlToolOperationJournal } from "./tools/operations/SqlToolOperationJournal";
export type { ToolRunResult } from "./tools/ToolRunResult";
export { BoundedToolRunner } from "./tools/BoundedToolRunner";
export { ToolDispatcher } from "./tools/ToolDispatcher";
export type { IScopedSourceReader } from "./tools/source/IScopedSourceReader";
export { ReadSourceArgumentsContract } from "./tools/source/ReadSourceArgumentsContract";
export { ReadSourceTool } from "./tools/source/ReadSourceTool";
```
