# 09. Budgets, Limits, and Partial Outcomes

## What We Implement Here

Create a shared durable usage ledger that reserves capacity before an operation, charges child work to parent limits, and preserves unknown usage. Add cancellation/deadline and no-progress checks, plus a factory that returns collected work as an explicit stopped outcome. A login-investigation example shows how a parent can reuse supported findings while keeping verification unfinished.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `usage/UsageAmounts.ts` | `type UsageAmounts` |
| `usage/usageDimensions.ts` | `const usageDimensions` |
| `usage/zeroUsage.ts` | `const zeroUsage` |
| `usage/BudgetScope.ts` | `type BudgetScope` |
| `usage/BudgetReservation.ts` | `type BudgetReservation` |
| `usage/UsageLedgerSnapshot.ts` | `type UsageLedgerSnapshot` |
| `usage/BudgetDenial.ts` | `type BudgetDenial` |
| `usage/BudgetReservationDecision.ts` | `type BudgetReservationDecision` |
| `errors/BudgetAccountingError.ts` | `class BudgetAccountingError extends Error` |
| `usage/UsageLedger.ts` | `class UsageLedger` |
| `usage/UsageLedgerSnapshotContract.ts` | `class UsageLedgerSnapshotContract implements IResultContract<UsageLedgerSnapshot>` |
| `usage/IUsageLedgerStore.ts` | `interface IUsageLedgerStore` |
| `usage/UsageLedgerStatements.ts` | `type UsageLedgerStatements` |
| `usage/sqliteUsageLedgerStatements.ts` | `const sqliteUsageLedgerStatements` |
| `usage/postgresqlUsageLedgerStatements.ts` | `const postgresqlUsageLedgerStatements` |
| `usage/SqlUsageLedgerStore.ts` | `class SqlUsageLedgerStore implements IUsageLedgerStore` |
| `execution-control/ExecutionStopReason.ts` | `type ExecutionStopReason` |
| `execution-control/ExecutionBoundaryGuard.ts` | `class ExecutionBoundaryGuard` |
| `execution-control/ProgressGuard.ts` | `class ProgressGuard` |
| `execution-control/CollectedWork.ts` | `type CollectedWork` |
| `execution-control/PartialOutcomeFactory.ts` | `class PartialOutcomeFactory` |
| `execution-control/ExecutionLimitInput.ts` | `type ExecutionLimitInput` |
| `execution-control/ExecutionLimitDecision.ts` | `type ExecutionLimitDecision` |
| `execution-control/ExecutionLimitPolicy.ts` | `class ExecutionLimitPolicy implements IPolicy<ExecutionLimitInput, ExecutionLimitDecision>` |
| `examples/budgets/ParentReviewInput.ts` | `type ParentReviewInput` |
| `examples/budgets/LoginInvestigationExample.ts` | `class LoginInvestigationExample` |
| `examples/budgets/ParentPartialWorkConsumer.ts` | `class ParentPartialWorkConsumer` |
| `tests/usage/checkUsageLedger.ts` | `function checkUsageLedger` |
| `tests/execution-control/checkPartialOutcomes.ts` | `function checkPartialOutcomes` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [page 01](01-scope-and-implementation-roadmap.md) and [page 02](02-package-structure-and-oop-conventions.md) for the general OOP, writing, file, and naming rules. Import existing `ExecutionOutcome`, `PartialProgress`, `IPolicy`, SQL, validation, and codec contracts instead of duplicating them. Every class and interface has its own matching file; interface names start with `I`.
- `usage/` is the single consumable accounting module. `UsageLedger` is the deterministic domain object; `SqlUsageLedgerStore` owns durable mutation. All children, decisions, retries, provider fallbacks, corrections, and model changes use the same root ledger ID. Direct units receive an explicit root budget without a fake workflow. The host supplies authenticated project/scope identity; a ledger key is not authorization.
- Resolve inherited limits before adding a scope. In this version all six dimensions are explicit nonnegative safe integers; zero forbids consumption and omission is invalid. There is no implicit unlimited value. Children may narrow but never enlarge their parent limits. Scopes are added parent-first and limits stay immutable. A trusted budget-increase/versioning operation is outside these files; never implement it by calling `initialize()` with a larger balance.
- Admission is atomic across the selected scope and every ancestor: known consumption plus all outstanding reservations plus the requested amount must fit. Child allowance does not remove capacity from its parent until reserved, and parent totals include child work only once. A successful advisory policy decision is not a reservation. The fixed `ExecutionLimitPolicy` uses `IPolicy<ExecutionLimitInput, ExecutionLimitDecision>`; no competing policy interface is added.
- Reserve upper bounds before dispatch. Token estimates must include the complete prepared request and bounded requested output, following the future provider adapter's accounting rules. A reservation is not an exact invoice. Provider prompt caching can change reported categories or price but does not make repeated input free; do not subtract assumed cache hits. Money, account-wide provider quotas, and unreported metered categories require explicit adapter contracts rather than being mislabeled as these six counters.
- Every independently chargeable transport retry receives a distinct operation ID. Retrying delivery of the same accounting command retains its original ID. Exact `reserve()` replay returns the existing receipt, including whether it was already settled or remains uncertain; it **does not authorize redispatch**. The operation journal/lease owner must independently establish dispatch ownership and reconcile an uncertain operation before repeating it.
- `markUnknown()` preserves the entire reservation. Do not release capacity just because a request timed out, cancellation was requested, or a provider response omitted usage. Settle only with authoritative measured usage or justified conservative accounting. Confirmed no-charge work settles to zero; confirmed attempted calls can still consume a call even when their token usage is zero. An exact repeated settlement is idempotent; conflicting settlements fail. Actual usage above the estimate is retained and prevents further admission, rather than being truncated to the cap. A provider may overshoot or ignore cancellation; the framework limits new dispatch, not external billing after the fact.
- SQL callbacks are synchronous deterministic ledger mutations only. Never put model calls, tool execution, sleeps, repository-owned nested transactions, or asynchronous policy evaluation inside `mutate()`. Its store locks the row, reloads authoritative state, mutates, validates/encodes, and commits in one pinned transaction. A callback exception or write failure rolls back. Values returned by a rejected transaction are not durable receipts. After uncertain commit, retry by stable operation identity and inspect the saved state.
- SQL adapters use page-06 transaction and cross-worker migration-lock guarantees. Fixed version-1 tables and envelope schema are explicit; incompatible future schema changes require migrations and compatibility checks. Initialization inserts only when absent and validates existing saved data; it never resets consumption. Checkpoint restoration must consult this current ledger instead of replacing it with an older balance. Persist deadlines and progress-guard state through the later checkpoint owner before claiming complete process recovery.
- The bounded reference ledger allows 256 scopes and 10,000 retained reservation receipts, subject also to the codec's byte/node bounds. It deliberately fails visibly at capacity; it does not delete deduplication history to manufacture allowance. A production adapter needing more scale must normalize receipts and preserve atomicity/idempotency. The example codec bound should fit the intended workload; it is not a recommended universal default.
- `ExecutionBoundaryGuard` checks cancellation and the earliest inherited absolute deadline before admission, after waits, and immediately before dispatch. The owner must reject a child deadline later than its parent. If the second check stops dispatch, settle a newly acquired reservation to zero only after confirming nothing was sent. Persisted UTC deadlines survive restart; local operation durations use the page-08 monotonic clock. Adapters own cooperative cancellation, process termination, response-size caps, and provider request timeouts. A stopped outcome never proves that side effects did not happen.
- `ProgressGuard` counts consecutive identical approved fingerprints; the first observation counts as one. Fingerprints describe safe observable state, not private reasoning or arbitrary user text. This small object is process-local; the future checkpoint owner must save/restore progress state if it is used across recovery. Technical retry counts, retry delay, fix cycles, and session iterations must be bounded by their respective owners. Charge consumable `fixes` and `iterations` in the ledger rather than resetting them during re-planning.
- Structural limits (context capacity, sub-agent depth, output bytes), concurrency/rate controls, filesystem permissions, artifact quotas, and retention are separate boundary controls. They must not be represented as a refundable total-call balance. Their complete implementations belong to the owning later specifications. This page establishes consumable reservations, basic boundary checks, and explicit partial outcomes; it does not claim to finish every runtime limit in the framework.
- At a hard stop, build `ExecutionOutcome` with `status: "stopped"`, a specific existing reason code, preserved `PartialProgress`, and pending uncertain operation references. Do not cast it to a completed result, erase unresolved requirements, or issue another model call to write a closing summary. Build the summary deterministically from already collected work. Only confirmed saved artifact/evidence references may be included; authorization and provenance checks remain required. If the bounded outcome cannot contain all references, save a bounded manifest through the artifact owner and reference it, rather than silently dropping uncertain work.
- Required outcome/checkpoint/usage persistence is a bounded housekeeping path owned by the runtime, separate from the exhausted model/tool allowance. It must not start new investigation or correction work. If saving fails, report persistence failure honestly and retain uncertainty; do not claim the stop was durably recorded. Page-08 optional logging can be disabled without disabling accounting. Budget-specific debug event schemas must be added explicitly to that vocabulary before emitting them; no arbitrary unregistered event strings are used here.
- The login example assumes a parent root with two permitted tool calls and an `investigation` child with a two-call cap. Its host first reserves and settles `login-check-first` and `login-check-second` after the corresponding fixture work. The denied third call returns two existing evidence references, a saved report reference, and the unresolved verification requirement. `ParentPartialWorkConsumer` filters against a host-validated accepted-evidence set and carries the unresolved requirement forward; it does not run a parent model call, approve publication, or declare login finished. Any further parent work needs its own remaining ancestor allowance and acceptance checks.
- Run deterministic checks for boundary admission, child accounting, duplicate/conflicting identities, zero limits, unknown reservations, settlement replay, overage, cancellation, deadline equality, no progress, and copied partial work. SQL acceptance additionally requires concurrent competing reservations, transaction rollback, exact retries, scope isolation, and reopening the same ledger without resetting usage on both supported database bindings. No live model calls are required.

## TypeScript Code for Each File

### `usage/UsageAmounts.ts`

Uses nonnegative safe integers for six independent consumable dimensions; tokens are accounting units, never monetary estimates.

```typescript
export type UsageAmounts = Readonly<{
  modelCalls: number; inputTokens: number; outputTokens: number;
  toolCalls: number; iterations: number; fixes: number;
}>;
```

### `usage/usageDimensions.ts`

Provides the authoritative dimension list for validation and arithmetic.

```typescript
import type { UsageAmounts } from "./UsageAmounts";
export const usageDimensions: readonly (keyof UsageAmounts)[] = Object.freeze([
  "modelCalls", "inputTokens", "outputTokens", "toolCalls", "iterations", "fixes",
]);
```

### `usage/zeroUsage.ts`

Provides immutable zero usage for deterministic initialization and confirmed no-charge settlement.

```typescript
import type { UsageAmounts } from "./UsageAmounts";
export const zeroUsage: UsageAmounts = Object.freeze({ modelCalls: 0, inputTokens: 0, outputTokens: 0, toolCalls: 0, iterations: 0, fixes: 0 });
```

### `usage/BudgetScope.ts`

Defines an immutable root or child allowance; every child operation is also charged to all ancestors.

```typescript
import type { UsageAmounts } from "./UsageAmounts";
export type BudgetScope = Readonly<{ id: string; parentId: string | null; limits: UsageAmounts }>;
```

### `usage/BudgetReservation.ts`

Keeps the operation identity, reserved upper estimate, and known/unknown settlement without silently releasing uncertainty.

```typescript
import type { UsageAmounts } from "./UsageAmounts";
export type BudgetReservation = Readonly<{
  operationId: string; scopeId: string; requested: UsageAmounts;
  status: "reserved" | "unknown" | "settled"; actual: UsageAmounts | null;
}>;
```

### `usage/UsageLedgerSnapshot.ts`

Persists the versioned effective scope tree and all operation receipts; counters are derived so retries cannot double-charge them.

```typescript
import type { BudgetScope } from "./BudgetScope";
import type { BudgetReservation } from "./BudgetReservation";
export type UsageLedgerSnapshot = Readonly<{
  schemaVersion: 1; scopes: readonly BudgetScope[]; reservations: readonly BudgetReservation[];
}>;
```

### `usage/BudgetDenial.ts`

Explains the exact ancestor and resource that cannot admit the next reservation.

```typescript
import type { UsageAmounts } from "./UsageAmounts";
export type BudgetDenial = Readonly<{
  scopeId: string; dimension: keyof UsageAmounts; limit: number;
  consumed: number; reserved: number; requested: number;
}>;
```

### `usage/BudgetReservationDecision.ts`

Separates denial from admission and marks exact replay; admission alone is not a dispatch lease.

```typescript
import type { BudgetReservation } from "./BudgetReservation";
import type { BudgetDenial } from "./BudgetDenial";
export type BudgetReservationDecision =
  | Readonly<{ admitted: true; replayed: boolean; reservation: BudgetReservation }>
  | Readonly<{ admitted: false; denial: BudgetDenial }>;
```

### `errors/BudgetAccountingError.ts`

Signals invalid ledger state, conflicting operation identity, or an illegal accounting transition.

```typescript
export class BudgetAccountingError extends Error {
  readonly code = "BUDGET_ACCOUNTING_INVALID";
  constructor() { super("Budget accounting data or transition is invalid."); this.name = "BudgetAccountingError"; }
}
```

### `usage/UsageLedger.ts`

Implements deterministic hierarchical reservation and settlement; its owner persists the complete mutation atomically.

```typescript
import type { UsageAmounts } from "./UsageAmounts";
import type { BudgetScope } from "./BudgetScope";
import type { BudgetReservation } from "./BudgetReservation";
import type { UsageLedgerSnapshot } from "./UsageLedgerSnapshot";
import type { BudgetReservationDecision } from "./BudgetReservationDecision";
import { usageDimensions } from "./usageDimensions";
import { zeroUsage } from "./zeroUsage";
import { BudgetAccountingError } from "../errors/BudgetAccountingError";

export class UsageLedger {
  private readonly scopes = new Map<string, BudgetScope>();
  private readonly reservations = new Map<string, BudgetReservation>();
  constructor(snapshot: UsageLedgerSnapshot) {
    if (snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.scopes) || !Array.isArray(snapshot.reservations) ||
        snapshot.scopes.length < 1 || snapshot.scopes.length > 256 || snapshot.reservations.length > 10000) this.invalid();
    for (const scope of snapshot.scopes) this.addScope(scope);
    if (snapshot.scopes.filter(item => item.parentId === null).length !== 1) this.invalid();
    for (const entry of snapshot.reservations) {
      this.id(entry.operationId); this.scope(entry.scopeId); this.amounts(entry.requested);
      if (this.reservations.has(entry.operationId) || !["reserved", "unknown", "settled"].includes(entry.status)) this.invalid();
      if (entry.status === "settled") this.amounts(entry.actual);
      else if (entry.actual !== null) this.invalid();
      this.reservations.set(entry.operationId, Object.freeze({ ...entry, requested: Object.freeze({ ...entry.requested }), actual: entry.actual === null ? null : Object.freeze({ ...entry.actual }) }));
    }
    // Reject overflow in restored totals, but retain real over-limit usage.
    for (const scope of this.scopes.values()) this.totals(scope.id);
  }
  addScope(input: BudgetScope): void {
    this.id(input.id); this.amounts(input.limits);
    if (this.scopes.has(input.id) || this.scopes.size >= 256) this.invalid();
    if (input.parentId === null) { if (this.scopes.size !== 0) this.invalid(); }
    else {
      const parent = this.scope(input.parentId);
      if (usageDimensions.some(key => input.limits[key] > parent.limits[key])) this.invalid();
    }
    this.scopes.set(input.id, Object.freeze({ ...input, limits: Object.freeze({ ...input.limits }) }));
  }
  reserve(operationId: string, scopeId: string, requested: UsageAmounts): BudgetReservationDecision {
    this.id(operationId); this.scope(scopeId); this.amounts(requested);
    const old = this.reservations.get(operationId);
    if (old !== undefined) {
      if (old.scopeId !== scopeId || !this.equal(old.requested, requested)) this.invalid();
      return { admitted: true, replayed: true, reservation: old };
    }
    if (this.reservations.size >= 10000) this.invalid();
    for (const ancestor of this.ancestors(scopeId)) {
      const totals = this.totals(ancestor.id);
      for (const dimension of usageDimensions) {
        const consumed = totals.consumed[dimension], reserved = totals.reserved[dimension];
        if (requested[dimension] > ancestor.limits[dimension] - consumed - reserved) {
          return { admitted: false, denial: { scopeId: ancestor.id, dimension, limit: ancestor.limits[dimension], consumed, reserved, requested: requested[dimension] } };
        }
      }
    }
    const reservation: BudgetReservation = Object.freeze({ operationId, scopeId, requested: Object.freeze({ ...requested }), status: "reserved", actual: null });
    this.reservations.set(operationId, reservation);
    return { admitted: true, replayed: false, reservation };
  }
  markUnknown(operationId: string): void {
    const entry = this.reservation(operationId);
    if (entry.status === "settled") this.invalid();
    this.reservations.set(operationId, Object.freeze({ ...entry, status: "unknown" }));
  }
  settle(operationId: string, actual: UsageAmounts): void {
    this.amounts(actual);
    const entry = this.reservation(operationId);
    if (entry.status === "settled") { if (!this.equal(entry.actual as UsageAmounts, actual)) this.invalid(); return; }
    const replacement: BudgetReservation = Object.freeze({ ...entry, status: "settled", actual: Object.freeze({ ...actual }) });
    this.reservations.set(operationId, replacement);
    try { for (const ancestor of this.ancestors(entry.scopeId)) this.totals(ancestor.id); }
    catch (error) { this.reservations.set(operationId, entry); throw error; }
  }
  totals(scopeId: string): Readonly<{ consumed: UsageAmounts; reserved: UsageAmounts }> {
    this.scope(scopeId);
    const consumed = { ...zeroUsage }, reserved = { ...zeroUsage };
    for (const entry of this.reservations.values()) {
      if (!this.ancestors(entry.scopeId).some(scope => scope.id === scopeId)) continue;
      const destination = entry.status === "settled" ? consumed : reserved;
      const amount = entry.status === "settled" ? entry.actual as UsageAmounts : entry.requested;
      for (const key of usageDimensions) {
        const sum = destination[key] + amount[key];
        if (!Number.isSafeInteger(sum)) this.invalid();
        destination[key] = sum;
      }
    }
    return Object.freeze({ consumed: Object.freeze(consumed), reserved: Object.freeze(reserved) });
  }
  snapshot(): UsageLedgerSnapshot { return Object.freeze({ schemaVersion: 1, scopes: Object.freeze([...this.scopes.values()]), reservations: Object.freeze([...this.reservations.values()]) }); }
  private ancestors(id: string): readonly BudgetScope[] {
    const result: BudgetScope[] = []; let current: BudgetScope | undefined = this.scope(id);
    while (current !== undefined) { result.push(current); current = current.parentId === null ? undefined : this.scope(current.parentId); }
    return result;
  }
  private scope(id: string): BudgetScope { const value = this.scopes.get(id); if (value === undefined) return this.invalid(); return value; }
  private reservation(id: string): BudgetReservation { const value = this.reservations.get(id); if (value === undefined) return this.invalid(); return value; }
  private equal(a: UsageAmounts, b: UsageAmounts): boolean { return usageDimensions.every(key => a[key] === b[key]); }
  private amounts(value: unknown): asserts value is UsageAmounts {
    if (typeof value !== "object" || value === null || Array.isArray(value)) this.invalid();
    const record = value as Record<string, unknown>;
    if (Object.keys(record).length !== usageDimensions.length || usageDimensions.some(key => typeof record[key] !== "number" || !Number.isSafeInteger(record[key]) || (record[key] as number) < 0)) this.invalid();
  }
  private id(value: unknown): void { if (typeof value !== "string" || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(value)) this.invalid(); }
  private invalid(): never { throw new BudgetAccountingError(); }
}
```

### `usage/UsageLedgerSnapshotContract.ts`

Validates restored bounded JSON before constructing the deterministic ledger; rejects unsupported envelope fields.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { UsageLedgerSnapshot } from "./UsageLedgerSnapshot";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { UsageLedger } from "./UsageLedger";
import { BudgetAccountingError } from "../errors/BudgetAccountingError";
export class UsageLedgerSnapshotContract implements IResultContract<UsageLedgerSnapshot> {
  readonly id = "usage-ledger"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(value: unknown): Promise<ValidationResult<UsageLedgerSnapshot>> {
    const checked = await this.json.validate(value);
    if (!checked.valid) return { valid: false, issues: checked.issues };
    const data = checked.value as unknown as UsageLedgerSnapshot;
    try {
      if (data === null || typeof data !== "object" || Object.keys(data).sort().join(",") !== "reservations,schemaVersion,scopes" ||
          !Array.isArray(data.scopes) || !Array.isArray(data.reservations) ||
          data.scopes.some(scope => scope === null || typeof scope !== "object" || Object.keys(scope).sort().join(",") !== "id,limits,parentId") ||
          data.reservations.some(entry => entry === null || typeof entry !== "object" || Object.keys(entry).sort().join(",") !== "actual,operationId,requested,scopeId,status")) throw new BudgetAccountingError();
      return { valid: true, value: new UsageLedger(data).snapshot() };
    } catch (error) {
      if (!(error instanceof BudgetAccountingError)) throw error;
      return { valid: false, issues: [{ path: [], code: "invalid-usage-ledger", message: "Usage ledger snapshot is invalid." }] };
    }
  }
}
```

### `usage/IUsageLedgerStore.ts`

Defines the durable single-owner mutation boundary; callbacks are synchronous, deterministic, and contain no external side effects.

```typescript
import type { UsageLedger } from "./UsageLedger";
import type { UsageLedgerSnapshot } from "./UsageLedgerSnapshot";
export interface IUsageLedgerStore {
  initialize(initial: UsageLedgerSnapshot): Promise<void>;
  mutate<TValue>(change: (ledger: UsageLedger) => TValue): Promise<TValue>;
  read(): Promise<UsageLedgerSnapshot>;
}
```

### `usage/UsageLedgerStatements.ts`

Injects SQL syntax rather than selecting database behavior with conditionals.

```typescript
export type UsageLedgerStatements = Readonly<{ schema: string; insert: string; lock: string; read: string; update: string }>;
```

### `usage/sqliteUsageLedgerStatements.ts`

Defines parameterized sqlite statements for one shared ledger row and version-1 table.

```typescript
import type { UsageLedgerStatements } from "./UsageLedgerStatements";
export const sqliteUsageLedgerStatements: UsageLedgerStatements = Object.freeze({
  "schema": "CREATE TABLE IF NOT EXISTS kushibot_usage_ledgers_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, ledger_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, ledger_id))",
  "insert": "INSERT INTO kushibot_usage_ledgers_v1 (scope_id, project_id, ledger_id, payload) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
  "lock": "UPDATE kushibot_usage_ledgers_v1 SET payload = payload WHERE scope_id = ? AND project_id = ? AND ledger_id = ?",
  "read": "SELECT payload FROM kushibot_usage_ledgers_v1 WHERE scope_id = ? AND project_id = ? AND ledger_id = ?",
  "update": "UPDATE kushibot_usage_ledgers_v1 SET payload = ? WHERE scope_id = ? AND project_id = ? AND ledger_id = ?"
});
```

### `usage/postgresqlUsageLedgerStatements.ts`

Defines parameterized postgresql statements for one shared ledger row and version-1 table.

```typescript
import type { UsageLedgerStatements } from "./UsageLedgerStatements";
export const postgresqlUsageLedgerStatements: UsageLedgerStatements = Object.freeze({
  "schema": "CREATE TABLE IF NOT EXISTS kushibot_usage_ledgers_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, ledger_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, ledger_id))",
  "insert": "INSERT INTO kushibot_usage_ledgers_v1 (scope_id, project_id, ledger_id, payload) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
  "lock": "UPDATE kushibot_usage_ledgers_v1 SET payload = payload WHERE scope_id = $1 AND project_id = $2 AND ledger_id = $3",
  "read": "SELECT payload FROM kushibot_usage_ledgers_v1 WHERE scope_id = $1 AND project_id = $2 AND ledger_id = $3",
  "update": "UPDATE kushibot_usage_ledgers_v1 SET payload = $1 WHERE scope_id = $2 AND project_id = $3 AND ledger_id = $4"
});
```

### `usage/SqlUsageLedgerStore.ts`

Locks the shared ledger row before reading, deciding, and writing so concurrent workers cannot over-reserve.

```typescript
import type { IUsageLedgerStore } from "./IUsageLedgerStore";
import type { UsageLedgerSnapshot } from "./UsageLedgerSnapshot";
import type { UsageLedgerStatements } from "./UsageLedgerStatements";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase";
import type { ISqlExecutor } from "../persistence/sql/ISqlExecutor";
import type { IRecordCodec } from "../contracts/persistence/IRecordCodec";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import { UsageLedger } from "./UsageLedger";
import { BudgetAccountingError } from "../errors/BudgetAccountingError";
export class SqlUsageLedgerStore implements IUsageLedgerStore {
  private readonly key: readonly string[];
  constructor(private readonly database: ISqlDatabase, private readonly sql: UsageLedgerStatements,
    scope: ExecutionScopeRef, ledgerId: string, private readonly codec: IRecordCodec<UsageLedgerSnapshot>) {
    if (![scope.scopeId, scope.projectId, ledgerId].every(id => /^[a-zA-Z0-9_.:-]{1,128}$/.test(id))) throw new BudgetAccountingError();
    this.key = Object.freeze([scope.scopeId, scope.projectId, ledgerId]);
  }
  async initialize(initial: UsageLedgerSnapshot): Promise<void> {
    const payload = await this.codec.encode(initial);
    await this.database.migrationTransaction(async tx => {
      await tx.query(this.sql.schema, []);
      await tx.query(this.sql.insert, [...this.key, payload]);
      // Existing state always wins. Restart never replaces consumption with the initial allowance.
      await this.load(tx);
    });
  }
  mutate<TValue>(change: (ledger: UsageLedger) => TValue): Promise<TValue> {
    return this.database.transaction(async tx => {
      const locked = await tx.query(this.sql.lock, this.key);
      if (locked.affectedRows !== 1) throw new BudgetAccountingError();
      const ledger = new UsageLedger(await this.load(tx));
      const result = change(ledger);
      if (result !== null && (typeof result === "object" || typeof result === "function") && "then" in result) throw new BudgetAccountingError();
      const payload = await this.codec.encode(ledger.snapshot());
      if ((await tx.query(this.sql.update, [payload, ...this.key])).affectedRows !== 1) throw new BudgetAccountingError();
      return result;
    });
  }
  read(): Promise<UsageLedgerSnapshot> { return this.load(this.database); }
  private async load(tx: ISqlExecutor): Promise<UsageLedgerSnapshot> {
    const result = await tx.query(this.sql.read, this.key);
    if (result.rows.length !== 1 || typeof result.rows[0].payload !== "string") throw new BudgetAccountingError();
    return this.codec.decode(result.rows[0].payload);
  }
}
```

### `execution-control/ExecutionStopReason.ts`

Reuses the shared stopped-outcome reason rather than introducing incompatible reason codes.

```typescript
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
export type ExecutionStopReason = Extract<ExecutionOutcome<never>, { status: "stopped" }> ["reason"];
```

### `execution-control/ExecutionBoundaryGuard.ts`

Checks cancellation and an inherited absolute deadline before dispatch and after waits; a timer alone cannot stop external effects.

```typescript
import type { IClock } from "../contracts/runtime/IClock";
import type { ExecutionStopReason } from "./ExecutionStopReason";
import { BudgetAccountingError } from "../errors/BudgetAccountingError";
export class ExecutionBoundaryGuard {
  constructor(private readonly clock: IClock, private readonly signal: AbortSignal, private readonly deadlineEpochMs: number | null) {
    if (deadlineEpochMs !== null && (!Number.isSafeInteger(deadlineEpochMs) || deadlineEpochMs < 0)) throw new BudgetAccountingError();
  }
  check(): ExecutionStopReason | null {
    if (this.signal.aborted) return { code: "cancelled", message: "Execution was cancelled." };
    const now = this.clock.nowEpochMs();
    if (!Number.isSafeInteger(now) || now < 0) throw new BudgetAccountingError();
    if (this.deadlineEpochMs !== null && now >= this.deadlineEpochMs) return { code: "deadline-reached", message: "Execution deadline was reached." };
    return null;
  }
}
```

### `execution-control/ProgressGuard.ts`

Stops repeated safe progress fingerprints without requiring private reasoning traces; meaningful changes reset the repetition count.

```typescript
import type { ExecutionStopReason } from "./ExecutionStopReason";
import { BudgetAccountingError } from "../errors/BudgetAccountingError";
export class ProgressGuard {
  private previous: string | null = null;
  private repetitions = 0;
  constructor(private readonly maxRepeatedObservations: number) {
    if (!Number.isSafeInteger(maxRepeatedObservations) || maxRepeatedObservations < 1) throw new BudgetAccountingError();
  }
  observe(fingerprint: string): ExecutionStopReason | null {
    if (!/^[a-zA-Z0-9_.:-]{1,128}$/.test(fingerprint)) throw new BudgetAccountingError();
    this.repetitions = fingerprint === this.previous ? this.repetitions + 1 : 1;
    this.previous = fingerprint;
    return this.repetitions >= this.maxRepeatedObservations ? { code: "no-progress", message: "Repeated observations show no useful progress." } : null;
  }
}
```

### `execution-control/CollectedWork.ts`

Carries previously saved, scoped references and unresolved requirements, plus uncertain operations that must not be blindly repeated.

```typescript
import type { PartialProgress } from "../contracts/outcomes/PartialProgress";
export type CollectedWork = Readonly<{ partial: PartialProgress; pendingOperationRefs: readonly string[] }>;
```

### `execution-control/PartialOutcomeFactory.ts`

Copies bounded validated progress into the existing stopped envelope without casting partial work into the completed result type.

```typescript
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome";
import type { CollectedWork } from "./CollectedWork";
import type { ExecutionStopReason } from "./ExecutionStopReason";
import { BudgetAccountingError } from "../errors/BudgetAccountingError";
export class PartialOutcomeFactory {
  stopped<TResult>(reason: ExecutionStopReason, work: CollectedWork): ExecutionOutcome<TResult> {
    this.text(reason.message, 512); this.text(work.partial.summary, 4096);
    if (!["limit-reached", "deadline-reached", "cancelled", "no-progress"].includes(reason.code)) throw new BudgetAccountingError();
    return Object.freeze({ status: "stopped", reason: Object.freeze({ ...reason }), partial: Object.freeze({
      summary: work.partial.summary, evidenceRefs: this.copy(work.partial.evidenceRefs, 256),
      artifactRefs: this.copy(work.partial.artifactRefs, 256), unresolved: this.copy(work.partial.unresolved, 1024),
    }), pendingOperationRefs: this.copy(work.pendingOperationRefs, 256) });
  }
  private copy(values: readonly string[], bytes: number): readonly string[] {
    if (!Array.isArray(values) || values.length > 128) throw new BudgetAccountingError();
    for (const value of values) this.text(value, bytes);
    return Object.freeze([...values]);
  }
  private text(value: string, bytes: number): void {
    if (typeof value !== "string" || new TextEncoder().encode(value).byteLength > bytes || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new BudgetAccountingError();
  }
}
```

### `execution-control/ExecutionLimitInput.ts`

Provides a frozen advisory view of one known reservation denial; it grants no capacity.

```typescript
import type { BudgetDenial } from "../usage/BudgetDenial";
export type ExecutionLimitInput = Readonly<{ denial: BudgetDenial }>;
```

### `execution-control/ExecutionLimitDecision.ts`

Returns the stop reason selected by this initial hard-limit policy implementation.

```typescript
import type { ExecutionStopReason } from "./ExecutionStopReason";
export type ExecutionLimitDecision = Readonly<{ action: "stop"; reason: ExecutionStopReason }>;
```

### `execution-control/ExecutionLimitPolicy.ts`

Uses the shared policy interface to describe denial; the atomic ledger remains the authority for admission.

```typescript
import type { IPolicy } from "../contracts/IPolicy";
import type { ExecutionLimitInput } from "./ExecutionLimitInput";
import type { ExecutionLimitDecision } from "./ExecutionLimitDecision";
export class ExecutionLimitPolicy implements IPolicy<ExecutionLimitInput, ExecutionLimitDecision> {
  async apply(_input: ExecutionLimitInput): Promise<ExecutionLimitDecision> {
    return Object.freeze({ action: "stop", reason: Object.freeze({ code: "limit-reached" as const, message: "The next operation exceeds its remaining allowance." }) });
  }
}
```

### `examples/budgets/ParentReviewInput.ts`

Keeps the parent’s usable evidence separate from unresolved verification work; consuming it does not imply task completion.

```typescript
export type ParentReviewInput = Readonly<{ acceptedEvidenceRefs: readonly string[]; remainingRequirements: readonly string[] }>;
```

### `examples/budgets/LoginInvestigationExample.ts`

Shows two child operations consuming one parent allowance and a denied third operation returning saved investigation work.

```typescript
import type { IUsageLedgerStore } from "../../usage/IUsageLedgerStore";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
import type { ParentReviewInput } from "./ParentReviewInput";
import { zeroUsage } from "../../usage/zeroUsage";
import { ExecutionLimitPolicy } from "../../execution-control/ExecutionLimitPolicy";
import { PartialOutcomeFactory } from "../../execution-control/PartialOutcomeFactory";
export class LoginInvestigationExample {
  constructor(private readonly store: IUsageLedgerStore, private readonly stops: PartialOutcomeFactory,
    private readonly policy: ExecutionLimitPolicy) {}
  async run(): Promise<ExecutionOutcome<ParentReviewInput>> {
    const decision = await this.store.mutate(ledger => ledger.reserve("login-check-third", "investigation", { ...zeroUsage, toolCalls: 1 }));
    if (decision.admitted) throw new Error("Example requires the two-call fixture budget to be exhausted.");
    const instruction = await this.policy.apply(Object.freeze({ denial: Object.freeze({ ...decision.denial }) }));
    // These are fixture references assumed already saved and authorized by the example's host.
    return this.stops.stopped(instruction.reason, { partial: {
      summary: "Located the login handler and its existing tests. Verification is unfinished.",
      evidenceRefs: ["evidence:login-handler", "evidence:login-tests"], artifactRefs: ["artifact:investigation-report"],
      unresolved: ["Run the login verification checks."],
    }, pendingOperationRefs: [] });
  }
}
```

### `examples/budgets/ParentPartialWorkConsumer.ts`

Shows a parent accepting only authorized supported findings while carrying the unfinished requirement forward.

```typescript
import type { PartialProgress } from "../../contracts/outcomes/PartialProgress";
import type { ParentReviewInput } from "./ParentReviewInput";
export class ParentPartialWorkConsumer {
  constructor(private readonly acceptedEvidence: ReadonlySet<string>) {}
  prepare(partial: PartialProgress): ParentReviewInput {
    return Object.freeze({ acceptedEvidenceRefs: Object.freeze(partial.evidenceRefs.filter(ref => this.acceptedEvidence.has(ref))),
      remainingRequirements: Object.freeze([...partial.unresolved]) });
  }
}
```

### `tests/usage/checkUsageLedger.ts`

Checks exact-boundary admission, shared ancestor accounting, replay, unknown usage, overage, and immutable snapshots offline.

```typescript
import { UsageLedger } from "../../usage/UsageLedger";
import { zeroUsage } from "../../usage/zeroUsage";
export function checkUsageLedger(): void {
  const limits = { ...zeroUsage, toolCalls: 2, inputTokens: 10 };
  const ledger = new UsageLedger({ schemaVersion: 1, scopes: [{ id: "run", parentId: null, limits }], reservations: [] });
  ledger.addScope({ id: "child", parentId: "run", limits });
  const request = { ...zeroUsage, toolCalls: 1 };
  if (!ledger.reserve("one", "child", request).admitted) throw new Error("First call denied.");
  ledger.markUnknown("one");
  if (!ledger.reserve("two", "run", request).admitted || ledger.reserve("three", "child", request).admitted) throw new Error("Parent allowance bypassed.");
  const replay = ledger.reserve("one", "child", request);
  if (!replay.admitted || !replay.replayed || replay.reservation.status !== "unknown") throw new Error("Replay lost uncertainty.");
  ledger.settle("one", request); ledger.settle("one", request);
  ledger.settle("two", { ...zeroUsage, toolCalls: 2 });
  const restored = new UsageLedger(ledger.snapshot());
  if (restored.totals("run").consumed.toolCalls !== 3 || restored.reserve("four", "run", request).admitted) throw new Error("Overage disappeared.");
  let rejected = false;
  try { ledger.addScope({ id: "oversized", parentId: "run", limits: { ...limits, toolCalls: 3 } }); } catch { rejected = true; }
  if (!rejected || !Object.isFrozen(ledger.snapshot().reservations)) throw new Error("Scope or snapshot validation failed.");
}
```

### `tests/execution-control/checkPartialOutcomes.ts`

Checks cancellation/deadline boundaries, repeated observations, and preserved unresolved partial work.

```typescript
import { ExecutionBoundaryGuard } from "../../execution-control/ExecutionBoundaryGuard";
import { ProgressGuard } from "../../execution-control/ProgressGuard";
import { PartialOutcomeFactory } from "../../execution-control/PartialOutcomeFactory";
export function checkPartialOutcomes(): void {
  const abort = new AbortController(); let now = 9;
  const guard = new ExecutionBoundaryGuard({ nowEpochMs: () => now }, abort.signal, 10);
  if (guard.check() !== null) throw new Error("Early deadline.");
  now = 10;
  if (guard.check()?.code !== "deadline-reached") throw new Error("Deadline boundary ignored.");
  abort.abort(); if (guard.check()?.code !== "cancelled") throw new Error("Cancellation ignored.");
  const progress = new ProgressGuard(2);
  if (progress.observe("same") !== null || progress.observe("same")?.code !== "no-progress") throw new Error("No-progress limit ignored.");
  const refs = ["saved:one"];
  const outcome = new PartialOutcomeFactory().stopped<string>({ code: "limit-reached", message: "Allowance unavailable." }, {
    partial: { summary: "One finding saved.", evidenceRefs: refs, artifactRefs: [], unresolved: ["Verification remains."] }, pendingOperationRefs: ["operation:uncertain"],
  });
  refs.push("later");
  if (outcome.status !== "stopped" || outcome.partial.evidenceRefs.length !== 1 || outcome.pendingOperationRefs.length !== 1 || outcome.partial.unresolved.length !== 1) throw new Error("Partial work changed.");
}
```

### `index.ts`

Appends production budget and execution-control declarations to the existing entry point; test and example classes stay private.

```typescript
export type { UsageAmounts } from "./usage/UsageAmounts";
export { usageDimensions } from "./usage/usageDimensions";
export { zeroUsage } from "./usage/zeroUsage";
export type { BudgetScope } from "./usage/BudgetScope";
export type { BudgetReservation } from "./usage/BudgetReservation";
export type { UsageLedgerSnapshot } from "./usage/UsageLedgerSnapshot";
export type { BudgetDenial } from "./usage/BudgetDenial";
export type { BudgetReservationDecision } from "./usage/BudgetReservationDecision";
export { BudgetAccountingError } from "./errors/BudgetAccountingError";
export { UsageLedger } from "./usage/UsageLedger";
export { UsageLedgerSnapshotContract } from "./usage/UsageLedgerSnapshotContract";
export type { IUsageLedgerStore } from "./usage/IUsageLedgerStore";
export type { UsageLedgerStatements } from "./usage/UsageLedgerStatements";
export { sqliteUsageLedgerStatements } from "./usage/sqliteUsageLedgerStatements";
export { postgresqlUsageLedgerStatements } from "./usage/postgresqlUsageLedgerStatements";
export { SqlUsageLedgerStore } from "./usage/SqlUsageLedgerStore";
export type { ExecutionStopReason } from "./execution-control/ExecutionStopReason";
export { ExecutionBoundaryGuard } from "./execution-control/ExecutionBoundaryGuard";
export { ProgressGuard } from "./execution-control/ProgressGuard";
export type { CollectedWork } from "./execution-control/CollectedWork";
export { PartialOutcomeFactory } from "./execution-control/PartialOutcomeFactory";
export type { ExecutionLimitInput } from "./execution-control/ExecutionLimitInput";
export type { ExecutionLimitDecision } from "./execution-control/ExecutionLimitDecision";
export { ExecutionLimitPolicy } from "./execution-control/ExecutionLimitPolicy";
```
