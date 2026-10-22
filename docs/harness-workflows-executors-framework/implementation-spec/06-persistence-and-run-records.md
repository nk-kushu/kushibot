# 06. Persistence and Run Records

## What We Implement Here

Create validated, bounded execution records and a scope-bound SQL repository for workflow runs, steps, and sessions. Save records with atomic version checks and durable save-command receipts, initialize a versioned framework-owned schema, and restore validated snapshots. SQLite and PostgreSQL use separate SQL profiles behind an injected database binding; real-driver connection setup and resource ownership remain explicit integration work, not hidden behavior in constructors.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `contracts/persistence/JsonValue.ts` | `type JsonValue` |
| `contracts/persistence/ExecutionRecord.ts` | `type ExecutionRecord` |
| `contracts/persistence/StoredExecutionRecord.ts` | `type StoredExecutionRecord` |
| `contracts/persistence/SaveExecutionRecord.ts` | `type SaveExecutionRecord` |
| `contracts/persistence/SaveRecordReceipt.ts` | `type SaveRecordReceipt` |
| `contracts/persistence/IExecutionRecordRepository.ts` | `interface IExecutionRecordRepository` |
| `contracts/persistence/IRecordCodec.ts` | `interface IRecordCodec<TRecord>` |
| `errors/InvalidPersistenceRecordError.ts` | `class InvalidPersistenceRecordError extends Error` |
| `errors/PersistenceConflictError.ts` | `class PersistenceConflictError extends Error` |
| `errors/CommandIdentityConflictError.ts` | `class CommandIdentityConflictError extends Error` |
| `persistence/JsonValueContract.ts` | `class JsonValueContract implements IResultContract<JsonValue>` |
| `persistence/ExecutionRecordContract.ts` | `class ExecutionRecordContract implements IResultContract<ExecutionRecord>` |
| `persistence/JsonRecordCodec.ts` | `class JsonRecordCodec<TRecord> implements IRecordCodec<TRecord>` |
| `persistence/sql/SqlValue.ts` | `type SqlValue` |
| `persistence/sql/SqlResult.ts` | `type SqlResult` |
| `persistence/sql/ISqlExecutor.ts` | `interface ISqlExecutor` |
| `persistence/sql/ISqlDatabase.ts` | `interface ISqlDatabase extends ISqlExecutor` |
| `persistence/sql/ExecutionRecordStatements.ts` | `type ExecutionRecordStatements` |
| `persistence/sqlite/sqliteExecutionRecordStatements.ts` | `const sqliteExecutionRecordStatements` |
| `persistence/postgresql/postgresqlExecutionRecordStatements.ts` | `const postgresqlExecutionRecordStatements` |
| `persistence/ExecutionRecordSchema.ts` | `class ExecutionRecordSchema` |
| `persistence/SqlExecutionRecordRepository.ts` | `class SqlExecutionRecordRepository implements IExecutionRecordRepository` |
| `persistence/PersistenceServices.ts` | `type PersistenceServices` |
| `persistence/IPersistenceFactory.ts` | `interface IPersistenceFactory` |
| `persistence/sqlite/SqlitePersistenceFactory.ts` | `class SqlitePersistenceFactory implements IPersistenceFactory` |
| `persistence/postgresql/PostgresqlPersistenceFactory.ts` | `class PostgresqlPersistenceFactory implements IPersistenceFactory` |
| `tests/fixtures/createExecutionRecord.ts` | `function createExecutionRecord(scope, executionId)` |
| `tests/persistence/IPersistenceTestHarness.ts` | `interface IPersistenceTestHarness` |
| `tests/persistence/ExecutionRecordRepository.test.ts` | `async function verifyExecutionRecordRepository(harness)` |
| `tests/persistence/JsonRecordCodec.test.ts` | `async function verifyRecordCodec()` |
| `tests/persistence/SqlitePersistence.test.ts` | `async function verifySqlitePersistence(harness)` |
| `tests/persistence/PostgresqlPersistence.test.ts` | `async function verifyPostgresqlPersistence(harness)` |
| `examples/persistence/main.ts` | `async function runPersistenceExample(database)` |
| `index.ts` | `Additional explicit type and value exports` |
| `tests/contracts/PersistenceApi.compile.ts` | `Compile-only persistence API fixture` |


## Rules Specific to These Files

General OOP and naming conventions remain in [01](01-scope-and-implementation-roadmap.md). Reuse [03](03-core-contracts-and-shared-policy.md), [04](04-configuration-and-dependency-injection.md), and [05](05-execution-identities-and-state-machines.md) declarations. Existing interfaces, error classes, configuration, and lifecycle snapshots are dependencies, not files to recreate.

| File or concept | Required rules |
| --- | --- |
| ExecutionRecord | This is one execution's storage envelope, not a replacement WorkflowRun or AgenticSession implementation. Preserve identity, trusted scope, lifecycle/version, definition identity, effective configuration, implementation registrations, source/checkpoint references, and outcomes. Later components add their separately versioned records for conversation, attempts, usage, operations, and delivery. Do not embed the entire host or notebook here. |
| Record validation | Validate incoming data and every loaded/decoded row. Require lifecycle executionId to match its owning runId, stepRunId, or sessionId. Reject unknown fields and unsupported versions. Terminal completed/failed/stopped/cancelled states require matching outcome data; cancelled also requires the cancelled reason. Outcome references to uncertain operations must also remain in the lifecycle pending list. A terminal lifecycle with no pending work cannot hide an outcome claiming unreconciled actions. Structural checks cannot establish source truth, authorization, accepted checks, or approval. |
| Canonical JSON and size | Only finite JSON is supported. Reject undefined, functions, cycles, symbols, getters, non-plain objects, non-finite numbers, excessive depth, or excessive node counts. Canonical key ordering makes equivalent command payloads comparable. Enforce the configured UTF-8 byte limit in both directions. Large reports belong in later artifacts, not an unbounded record. |
| Scope | Bind each repository to trusted effective scope supplied by the host. SQL keys include scopeId and projectId; payload validation additionally checks workspaceId. A forged scope object is not authorization. Later host/storage authorization must validate that the caller may obtain this bound repository in the first place. |
| Storage version vs lifecycle revision | recordVersion begins at 1 on creation and increments once per successful save. expectedVersion 0 is create-only; updates require the exact current storage version. lifecycle.revision belongs to page 05 and may advance by several local transitions before a save. It must not regress. They are different counters and neither resets budgets. |
| Immutable history | Ordinary updates cannot change identity, definition/version, effective configuration, registration metadata, lifecycle kind, or graph version. Terminal records cannot be rewritten to different data. An explicitly authorized continuation or migration needs its own modeled compatibility path, not an ordinary save bypass. |
| Save-command identity | A command ID is scoped to this execution record. Persist its payload, expected version, and assigned version in the same transaction as the record write. The same command with the same canonical payload and expected version returns its original receipt, even after newer saves. It does not overwrite or pretend to return the latest row. A changed payload or expected version is an identity conflict. |
| Concurrent duplicate delivery | CAS and unique receipt keys prevent double application. A concurrent duplicate may initially encounter a version/unique-key conflict; retry the same recorded save command only after rollback and a fresh receipt lookup. No transparent unbounded retry is built into this repository. Do not rerun an executor to retry persistence. |
| Transactions | ISqlDatabase.transaction must pin one real connection, commit only if the callback succeeds, and fully roll back on any callback or statement failure. Repositories never hold a transaction around provider calls, tools, approval waiting, or unrelated work. An uncertain COMMIT outcome requires loading the receipt with the same command ID, not assuming rollback. |
| SQL binding | ISqlDatabase is an integration boundary, not an already implemented driver. Supply a verified adapter for the chosen SQLite/PostgreSQL client. Normalize selected integer versions and affectedRows to safe JavaScript numbers, preserve row payload strings, parameterize values, and translate unexpected driver/storage errors into the existing safe PersistenceError without masking domain conflicts. A fake or an interface alone does not prove backend support. |
| Schema initialization | Use only the fixed kushibot_ tables. The ledger entry execution-records/version 1 covers these two data tables. Migration startup must run under a backend-wide lock with transactional DDL; reject unknown versions and do not accept work after initialization failure. Matching ledger version assumes the installation is intact; missing/corrupt tables fail visibly on access and require repair, not silent reset. Future schema changes need ordered migrations. |
| Migration locking | migrationTransaction must coordinate all workers for this namespace, not just one JavaScript object. A SQLite binding can use an appropriately serialized BEGIN IMMEDIATE transaction; a PostgreSQL binding can use a dedicated transaction-level advisory lock before inspecting the ledger. Lock waits and busy/serialization failures stay bounded by configured startup policy. See [SQLite transactions](https://www.sqlite.org/lang_transaction.html) and [PostgreSQL advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS). |
| Backend SQL | SQLite uses positional ? parameters; PostgreSQL uses $1-style parameters. The two factory implementations choose statement data through composition; the repository contains no provider-name switch. Connections, credentials, optional SDK imports, pool startup, and disposal are handled by explicit integration/startup, detailed in spec 27. Changing factories does not migrate stored data. |
| Record and receipt durability | Record update and receipt insertion are atomic within one SQL database. This is not a cross-store transaction with artifact bytes, memory, events, or files. Receipt payloads duplicate bounded record bytes; retention and quotas must preserve the supported replay window. No deletion/cleanup policy is invented here. Storage exhaustion remains a visible persistence failure. |
| Partial outcomes | Persist the page-03 outcome and unresolved work without converting partial data to the completed result. A saved record is not automatically an accepted workflow dependency. Required acceptance and artifact durability still belong to their owners. Pending/unknown tool effects are not cleared because a record was saved. |
| Recovery boundary | Loading validates data; ExecutionLifecycle.restore validates its lifecycle again. Neither automatically executes a session, reconciles a file write, acquires a worker lease, or resumes publication. Checkpoint byte formats, durable execution commands/outboxes, usage reservations, leases, and effect reconciliation are refined by their owning specs, especially 09, 19, and 24. The save receipt deduplicates saves only, not external actions. |
| Backend verification | Invoke the shared repository test against each real disposable backend, including close/reopen of the same store. A mock transaction cannot establish rollback/CAS guarantees. Add concurrent stale-writer and duplicate-command races, rollback after receipt failure, corrupt-row, unsupported-schema, and unknown-COMMIT tests to the real binding's integration suite before claiming support. The shown shared check covers the basic contract, a competing-writer race, partial-outcome retention, and restart; it does not cover every driver fault or concurrent duplicate-command race. |
| Examples and exports | The persistence example requires an injected SQLite database binding; it is not executable by merely importing the file. Numeric limits and references are fixtures. Public index.ts exports are additive. Test harness implementations manage disposable stores and must not point at application data. |

## TypeScript Code for Each File

Each heading is a separate file. Reuse earlier specification code. The SQL factories are complete composition examples for the shown repository but require a real ISqlDatabase binding; no unimplemented SDK binding is disguised as a working connection.

### `contracts/persistence/JsonValue.ts`

Defines the finite JSON data allowed in persisted payloads; live objects and functions are excluded.

```typescript
export type JsonValue =
  | null | boolean | number | string
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;
```

### `contracts/persistence/ExecutionRecord.ts`

Combines a lifecycle snapshot with trusted scope, identity, effective configuration, registrations, evidence references, and any recorded outcome.

```typescript
import type { ExecutionIdentity } from "../runtime/ExecutionIdentity";
import type { ExecutionScopeRef } from "../runtime/ExecutionScopeRef";
import type { ExecutionOutcome } from "../outcomes/ExecutionOutcome";
import type { LifecycleSnapshot } from "../../domain/lifecycle/LifecycleSnapshot";
import type { FrameworkConfiguration } from "../../configuration/FrameworkConfiguration";
import type { RegistrationMetadata } from "../../composition/RegistrationMetadata";
import type { JsonValue } from "./JsonValue";

export type ExecutionRecord = Readonly<{
  schemaVersion: 1;
  scope: ExecutionScopeRef;
  identity: ExecutionIdentity;
  lifecycle: LifecycleSnapshot;
  definition: Readonly<{ id: string; version: string }>;
  configuration: FrameworkConfiguration;
  registrations: readonly RegistrationMetadata[];
  sourceRefs: readonly string[];
  checkpointRef: string | null;
  outcome: ExecutionOutcome<JsonValue> | null;
}>;
```

### `contracts/persistence/StoredExecutionRecord.ts`

Pairs a validated execution record with its database compare-and-set version.

```typescript
import type { ExecutionRecord } from "./ExecutionRecord";

export type StoredExecutionRecord = Readonly<{
  recordVersion: number;
  record: ExecutionRecord;
}>;
```

### `contracts/persistence/SaveExecutionRecord.ts`

Identifies one save command and the storage version it expects to replace; zero means create-only.

```typescript
import type { ExecutionRecord } from "./ExecutionRecord";

export type SaveExecutionRecord = Readonly<{
  commandId: string;
  expectedVersion: number;
  record: ExecutionRecord;
}>;
```

### `contracts/persistence/SaveRecordReceipt.ts`

Returns the stored version and record, marking whether the same command was delivered again.

```typescript
import type { StoredExecutionRecord } from "./StoredExecutionRecord";

export type SaveRecordReceipt = Readonly<{
  stored: StoredExecutionRecord;
  replayed: boolean;
}>;
```

### `contracts/persistence/IExecutionRecordRepository.ts`

Defines scope-bound loading and atomic idempotent saving of workflow, step, or session records.

```typescript
import type { StoredExecutionRecord } from "./StoredExecutionRecord";
import type { SaveExecutionRecord } from "./SaveExecutionRecord";
import type { SaveRecordReceipt } from "./SaveRecordReceipt";

export interface IExecutionRecordRepository {
  load(executionId: string): Promise<StoredExecutionRecord | null>;
  save(command: SaveExecutionRecord): Promise<SaveRecordReceipt>;
}
```

### `contracts/persistence/IRecordCodec.ts`

Defines bounded validated serialization and deserialization without exposing a database or schema library.

```typescript
export interface IRecordCodec<TRecord> {
  encode(value: unknown): Promise<string>;
  decode(serialized: string): Promise<TRecord>;
}
```

### `errors/InvalidPersistenceRecordError.ts`

Reports invalid, incompatible, corrupt, or oversized persisted data.

```typescript
export class InvalidPersistenceRecordError extends Error {
  readonly code = "INVALID_PERSISTENCE_RECORD";
  constructor(message: string) {
    super(message);
    this.name = "InvalidPersistenceRecordError";
  }
}
```

### `errors/PersistenceConflictError.ts`

Reports a stale storage version, conflicting creation, or prohibited record-history change.

```typescript
export class PersistenceConflictError extends Error {
  readonly code = "PERSISTENCE_CONFLICT";
  constructor(message: string) {
    super(message);
    this.name = "PersistenceConflictError";
  }
}
```

### `errors/CommandIdentityConflictError.ts`

Reports reuse of one save-command ID for different input.

```typescript
export class CommandIdentityConflictError extends Error {
  readonly code = "COMMAND_IDENTITY_CONFLICT";
  constructor(message: string) {
    super(message);
    this.name = "CommandIdentityConflictError";
  }
}
```

### `persistence/JsonValueContract.ts`

Builds canonical frozen JSON data, rejecting unsupported values, cycles, excessive nesting, and excessive node counts.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { JsonValue } from "../contracts/persistence/JsonValue";
import { InvalidPersistenceRecordError } from "../errors/InvalidPersistenceRecordError";

export class JsonValueContract implements IResultContract<JsonValue> {
  readonly id = "finite-json";
  readonly version = "1";

  async validate(value: unknown): Promise<ValidationResult<JsonValue>> {
    try {
      return { valid: true, value: this.copy(value, new Set<object>(), { remaining: 10000 }, 0) };
    } catch (error: unknown) {
      if (!(error instanceof InvalidPersistenceRecordError)) throw error;
      return { valid: false, issues: [{ path: [], code: error.code, message: error.message }] };
    }
  }

  private copy(value: unknown, ancestors: Set<object>, budget: { remaining: number }, depth: number): JsonValue {
    budget.remaining -= 1;
    if (budget.remaining < 0 || depth > 64) throw new InvalidPersistenceRecordError("JSON structure limit reached.");
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "object" || value === null || ancestors.has(value)) {
      throw new InvalidPersistenceRecordError("Unsupported or cyclic JSON value.");
    }
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new InvalidPersistenceRecordError("Only plain JSON objects are supported.");
    }
    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        if (value.length > budget.remaining || Reflect.ownKeys(value).length !== value.length + 1) {
          throw new InvalidPersistenceRecordError("Array structure is oversized or has unsupported fields.");
        }
        const descriptors = Object.getOwnPropertyDescriptors(value);
        const items: JsonValue[] = [];
        for (let index = 0; index < value.length; index += 1) {
          const descriptor = descriptors[String(index)];
          if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
            throw new InvalidPersistenceRecordError("Sparse arrays and array getters are unsupported.");
          }
          items.push(this.copy(descriptor.value, ancestors, budget, depth + 1));
        }
        return Object.freeze(items);
      }
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const output: Record<string, JsonValue> = Object.create(null);
      if (Reflect.ownKeys(value).some(key => typeof key !== "string")) {
        throw new InvalidPersistenceRecordError("Symbol JSON keys are unsupported.");
      }
      for (const key of Object.keys(descriptors).sort()) {
        const descriptor = descriptors[key];
        if (!descriptor.enumerable || !("value" in descriptor)) {
          throw new InvalidPersistenceRecordError("JSON getters and hidden fields are unsupported.");
        }
        output[key] = this.copy(descriptor.value, ancestors, budget, depth + 1);
      }
      return Object.freeze(output);
    } finally { ancestors.delete(value); }
  }
}
```

### `persistence/ExecutionRecordContract.ts`

Validates record structure, scope, configuration, lifecycle ownership, and terminal outcome compatibility before saving or restoring.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { ExecutionRecord } from "../contracts/persistence/ExecutionRecord";
import { ExecutionIdentityContract } from "../contracts/runtime/ExecutionIdentityContract";
import { FrameworkConfigurationContract } from "../configuration/FrameworkConfigurationContract";
import { LifecycleSnapshotContract } from "../domain/lifecycle/LifecycleSnapshotContract";
import { workflowRunLifecycle } from "../domain/lifecycle/workflowRunLifecycle";
import { stepRunLifecycle } from "../domain/lifecycle/stepRunLifecycle";
import { agenticSessionLifecycle } from "../domain/lifecycle/agenticSessionLifecycle";
import { JsonValueContract } from "./JsonValueContract";

export class ExecutionRecordContract implements IResultContract<ExecutionRecord> {
  readonly id = "execution-record";
  readonly version = "1";
  private readonly lifecycles = new Map([
    ["workflow-run", new LifecycleSnapshotContract(workflowRunLifecycle)],
    ["step-run", new LifecycleSnapshotContract(stepRunLifecycle)],
    ["agentic-session", new LifecycleSnapshotContract(agenticSessionLifecycle)],
  ]);

  constructor(
    private readonly json: JsonValueContract,
    private readonly identities: ExecutionIdentityContract,
    private readonly configuration: FrameworkConfigurationContract,
  ) {}

  async validate(value: unknown): Promise<ValidationResult<ExecutionRecord>> {
    const json = await this.json.validate(value);
    if (!json.valid || !this.record(json.value)) return this.invalid();
    const data = json.value;
    if (!this.exact(data, ["schemaVersion", "scope", "identity", "lifecycle", "definition", "configuration",
      "registrations", "sourceRefs", "checkpointRef", "outcome"]) || data.schemaVersion !== 1 ||
      !this.record(data.scope) || !this.reference(data.scope.scopeId) || !this.reference(data.scope.projectId) ||
      Object.keys(data.scope).some(key => !["scopeId", "projectId", "workspaceId"].includes(key)) ||
      ("workspaceId" in data.scope && !this.reference(data.scope.workspaceId)) ||
      !this.record(data.definition) || !this.exact(data.definition, ["id", "version"]) ||
      !this.reference(data.definition.id) || !this.reference(data.definition.version) ||
      !this.record(data.lifecycle) || typeof data.lifecycle.kind !== "string" ||
      !this.references(data.sourceRefs) || !(data.checkpointRef === null || this.reference(data.checkpointRef)) ||
      !Array.isArray(data.registrations)) return this.invalid();
    const identities = await this.identities.validate(data.identity);
    const configuration = await this.configuration.validate(data.configuration);
    const lifecycleContract = this.lifecycles.get(data.lifecycle.kind);
    if (!identities.valid || !configuration.valid || lifecycleContract === undefined) return this.invalid();
    const lifecycle = await lifecycleContract.validate(data.lifecycle);
    if (!lifecycle.valid) return this.invalid();
    const owners = {
      "workflow-run": identities.value.runId,
      "step-run": identities.value.stepRunId,
      "agentic-session": identities.value.sessionId,
    };
    if (owners[lifecycle.value.kind] !== lifecycle.value.executionId) return this.invalid();
    const registrations = data.registrations;
    if (registrations.some(item => !this.registration(item)) ||
        new Set(registrations.map(item => (item as Record<string, unknown>).id)).size !== registrations.length ||
        !this.outcome(data.outcome)) return this.invalid();
    if (this.record(data.outcome) && data.outcome.status !== "completed" &&
        Array.isArray(data.outcome.pendingOperationRefs) &&
        data.outcome.pendingOperationRefs.some(ref => !lifecycle.value.pendingOperationRefs.includes(ref))) {
      return this.invalid();
    }
    const status = lifecycle.value.status;
    if ((status === "completed" && (!this.record(data.outcome) || data.outcome.status !== "completed")) ||
        (status === "failed" && (!this.record(data.outcome) || data.outcome.status !== "failed")) ||
        (["stopped", "cancelled"].includes(status) && (!this.record(data.outcome) || data.outcome.status !== "stopped")) ||
        (status === "cancelled" && this.record(data.outcome) &&
          (!this.record(data.outcome.reason) || data.outcome.reason.code !== "cancelled"))) return this.invalid();
    // Canonical JSON plus every required record field has been validated above.
    return { valid: true, value: data as ExecutionRecord };
  }

  private registration(value: unknown): boolean {
    return this.record(value) && this.exact(value, ["id", "implementationVersion", "configuration"]) &&
      this.reference(value.id) && this.reference(value.implementationVersion) && this.record(value.configuration) &&
      Object.values(value.configuration).every(item => item === null ||
        ["string", "boolean"].includes(typeof item) || (typeof item === "number" && Number.isFinite(item)));
  }
  private outcome(value: unknown): boolean {
    if (value === null) return true;
    if (!this.record(value)) return false;
    if (value.status === "completed") return this.exact(value, ["status", "result"]);
    if (!this.exact(value, ["status", value.status === "stopped" ? "reason" : "error", "partial", "pendingOperationRefs"]) ||
        !this.record(value.partial) || !this.exact(value.partial, ["summary", "evidenceRefs", "artifactRefs", "unresolved"]) ||
        typeof value.partial.summary !== "string" || !this.references(value.partial.evidenceRefs) ||
        !this.references(value.partial.artifactRefs) || !this.references(value.partial.unresolved) ||
        !this.references(value.pendingOperationRefs)) return false;
    const detail = value.status === "stopped" ? value.reason : value.error;
    if (!this.record(detail) || !this.exact(detail, ["code", "message"]) ||
        !this.reference(detail.code) || typeof detail.message !== "string") return false;
    return value.status === "failed" || (value.status === "stopped" &&
      ["limit-reached", "deadline-reached", "cancelled", "no-progress"].includes(detail.code));
  }
  private record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  private reference(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
  private references(value: unknown): value is readonly string[] {
    return Array.isArray(value) && value.every(item => this.reference(item));
  }
  private exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
    return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwnProperty.call(value, key));
  }
  private invalid(): ValidationResult<ExecutionRecord> {
    return { valid: false, issues: [{ path: [], code: "invalid-execution-record", message: "Execution record is invalid or incompatible." }] };
  }
}
```

### `persistence/JsonRecordCodec.ts`

Enforces UTF-8 byte limits, canonical JSON, and record validation in both serialization directions.

```typescript
import type { IRecordCodec } from "../contracts/persistence/IRecordCodec";
import type { IResultContract } from "../contracts/validation/IResultContract";
import { JsonValueContract } from "./JsonValueContract";
import { InvalidPersistenceRecordError } from "../errors/InvalidPersistenceRecordError";
import { ConfigurationError } from "../errors/ConfigurationError";

export class JsonRecordCodec<TRecord> implements IRecordCodec<TRecord> {
  constructor(
    private readonly contract: IResultContract<TRecord>,
    private readonly json: JsonValueContract,
    private readonly maxBytes: number,
  ) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new ConfigurationError("Invalid record byte limit.");
  }

  async encode(value: unknown): Promise<string> {
    const json = await this.json.validate(value);
    if (!json.valid) throw new InvalidPersistenceRecordError("Record is not supported JSON.");
    const checked = await this.contract.validate(json.value);
    if (!checked.valid) throw new InvalidPersistenceRecordError("Record contract rejected the value.");
    const canonical = await this.json.validate(checked.value);
    if (!canonical.valid) throw new InvalidPersistenceRecordError("Validator returned unsupported data.");
    const serialized = JSON.stringify(canonical.value);
    this.checkSize(serialized);
    return serialized;
  }

  async decode(serialized: string): Promise<TRecord> {
    this.checkSize(serialized);
    let parsed: unknown;
    try { parsed = JSON.parse(serialized); }
    catch (error: unknown) {
      if (!(error instanceof SyntaxError)) throw error;
      throw new InvalidPersistenceRecordError("Stored JSON is malformed.");
    }
    const json = await this.json.validate(parsed);
    if (!json.valid) throw new InvalidPersistenceRecordError("Stored JSON exceeds structural limits.");
    const checked = await this.contract.validate(json.value);
    if (!checked.valid) throw new InvalidPersistenceRecordError("Stored record is incompatible.");
    return checked.value;
  }

  private checkSize(serialized: string): void {
    if (typeof serialized !== "string" || serialized.length > this.maxBytes ||
        new TextEncoder().encode(serialized).byteLength > this.maxBytes) {
      throw new InvalidPersistenceRecordError("Serialized record exceeds its byte limit.");
    }
  }
}
```

### `persistence/sql/SqlValue.ts`

Defines the deliberately small parameter set used by these SQL statements.

```typescript
export type SqlValue = string | number | null;
```

### `persistence/sql/SqlResult.ts`

Normalizes selected row data and DML affected-row counts from a real driver binding.

```typescript
export type SqlResult = Readonly<{
  rows: readonly Readonly<Record<string, unknown>>[];
  affectedRows: number;
}>;
```

### `persistence/sql/ISqlExecutor.ts`

Runs one parameterized statement on the current connection or transaction.

```typescript
import type { SqlValue } from "./SqlValue";
import type { SqlResult } from "./SqlResult";

export interface ISqlExecutor {
  query(sql: string, parameters: readonly SqlValue[]): Promise<SqlResult>;
}
```

### `persistence/sql/ISqlDatabase.ts`

Defines atomic connection-pinned transactions and separately locked migration transactions.

```typescript
import type { ISqlExecutor } from "./ISqlExecutor";

export interface ISqlDatabase extends ISqlExecutor {
  transaction<T>(work: (transaction: ISqlExecutor) => Promise<T>): Promise<T>;
  migrationTransaction<T>(work: (transaction: ISqlExecutor) => Promise<T>): Promise<T>;
}
```

### `persistence/sql/ExecutionRecordStatements.ts`

Groups versioned schema DDL and backend-specific parameterized record and receipt statements.

```typescript
export type ExecutionRecordStatements = Readonly<{
  schema: readonly string[];
  readSchemaVersion: string;
  installSchemaVersion: string;
  selectRecord: string;
  insertRecord: string;
  updateRecord: string;
  selectReceipt: string;
  insertReceipt: string;
}>;
```

### `persistence/sqlite/sqliteExecutionRecordStatements.ts`

Defines fixed framework table DDL and sqlite SQL placeholders; statements run only through the injected database binding.

```typescript
import type { ExecutionRecordStatements } from "../sql/ExecutionRecordStatements";

export const sqliteExecutionRecordStatements: ExecutionRecordStatements = Object.freeze({
  schema: Object.freeze([
    "CREATE TABLE IF NOT EXISTS kushibot_schema_versions (\n  name TEXT PRIMARY KEY, version INTEGER NOT NULL CHECK (version > 0)\n)",
    "CREATE TABLE IF NOT EXISTS kushibot_execution_records (\n  scope_id TEXT NOT NULL, project_id TEXT NOT NULL, execution_id TEXT NOT NULL,\n  record_version BIGINT NOT NULL CHECK (record_version > 0),\n  payload TEXT NOT NULL,\n  PRIMARY KEY (scope_id, project_id, execution_id)\n)",
    "CREATE TABLE IF NOT EXISTS kushibot_save_receipts (\n  scope_id TEXT NOT NULL, project_id TEXT NOT NULL, execution_id TEXT NOT NULL,\n  command_id TEXT NOT NULL, expected_version BIGINT NOT NULL CHECK (expected_version >= 0),\n  record_version BIGINT NOT NULL CHECK (record_version > 0), payload TEXT NOT NULL,\n  PRIMARY KEY (scope_id, project_id, execution_id, command_id)\n)",
  ]),
  readSchemaVersion: "SELECT version FROM kushibot_schema_versions WHERE name = 'execution-records'",
  installSchemaVersion: "INSERT INTO kushibot_schema_versions (name, version) VALUES ('execution-records', 1)",
  selectRecord: "SELECT record_version, payload FROM kushibot_execution_records WHERE scope_id = ? AND project_id = ? AND execution_id = ?",
  insertRecord: "INSERT INTO kushibot_execution_records (scope_id, project_id, execution_id, record_version, payload) VALUES (?, ?, ?, ?, ?) ON CONFLICT (scope_id, project_id, execution_id) DO NOTHING",
  updateRecord: "UPDATE kushibot_execution_records SET record_version = ?, payload = ? WHERE scope_id = ? AND project_id = ? AND execution_id = ? AND record_version = ?",
  selectReceipt: "SELECT expected_version, record_version, payload FROM kushibot_save_receipts WHERE scope_id = ? AND project_id = ? AND execution_id = ? AND command_id = ?",
  insertReceipt: "INSERT INTO kushibot_save_receipts (scope_id, project_id, execution_id, command_id, expected_version, record_version, payload) VALUES (?, ?, ?, ?, ?, ?, ?)",
});
```

### `persistence/postgresql/postgresqlExecutionRecordStatements.ts`

Defines fixed framework table DDL and postgresql SQL placeholders; statements run only through the injected database binding.

```typescript
import type { ExecutionRecordStatements } from "../sql/ExecutionRecordStatements";

export const postgresqlExecutionRecordStatements: ExecutionRecordStatements = Object.freeze({
  schema: Object.freeze([
    "CREATE TABLE IF NOT EXISTS kushibot_schema_versions (\n  name TEXT PRIMARY KEY, version INTEGER NOT NULL CHECK (version > 0)\n)",
    "CREATE TABLE IF NOT EXISTS kushibot_execution_records (\n  scope_id TEXT NOT NULL, project_id TEXT NOT NULL, execution_id TEXT NOT NULL,\n  record_version BIGINT NOT NULL CHECK (record_version > 0),\n  payload TEXT NOT NULL,\n  PRIMARY KEY (scope_id, project_id, execution_id)\n)",
    "CREATE TABLE IF NOT EXISTS kushibot_save_receipts (\n  scope_id TEXT NOT NULL, project_id TEXT NOT NULL, execution_id TEXT NOT NULL,\n  command_id TEXT NOT NULL, expected_version BIGINT NOT NULL CHECK (expected_version >= 0),\n  record_version BIGINT NOT NULL CHECK (record_version > 0), payload TEXT NOT NULL,\n  PRIMARY KEY (scope_id, project_id, execution_id, command_id)\n)",
  ]),
  readSchemaVersion: "SELECT version FROM kushibot_schema_versions WHERE name = 'execution-records'",
  installSchemaVersion: "INSERT INTO kushibot_schema_versions (name, version) VALUES ('execution-records', 1)",
  selectRecord: "SELECT record_version, payload FROM kushibot_execution_records WHERE scope_id = $1 AND project_id = $2 AND execution_id = $3",
  insertRecord: "INSERT INTO kushibot_execution_records (scope_id, project_id, execution_id, record_version, payload) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (scope_id, project_id, execution_id) DO NOTHING",
  updateRecord: "UPDATE kushibot_execution_records SET record_version = $1, payload = $2 WHERE scope_id = $3 AND project_id = $4 AND execution_id = $5 AND record_version = $6",
  selectReceipt: "SELECT expected_version, record_version, payload FROM kushibot_save_receipts WHERE scope_id = $1 AND project_id = $2 AND execution_id = $3 AND command_id = $4",
  insertReceipt: "INSERT INTO kushibot_save_receipts (scope_id, project_id, execution_id, command_id, expected_version, record_version, payload) VALUES ($1, $2, $3, $4, $5, $6, $7)",
});
```

### `persistence/ExecutionRecordSchema.ts`

Checks and initializes version 1 of the framework-owned execution-record schema under a migration lock.

```typescript
import type { ISqlDatabase } from "./sql/ISqlDatabase";
import type { ExecutionRecordStatements } from "./sql/ExecutionRecordStatements";
import { PersistenceError } from "../errors/PersistenceError";

export class ExecutionRecordSchema {
  constructor(private readonly database: ISqlDatabase, private readonly statements: ExecutionRecordStatements) {}

  async initialize(): Promise<void> {
    await this.database.migrationTransaction(async transaction => {
      // The first table is only the framework migration ledger.
      await transaction.query(this.statements.schema[0], []);
      const version = await transaction.query(this.statements.readSchemaVersion, []);
      if (version.rows.length > 1) throw new PersistenceError("Ambiguous framework schema version.");
      if (version.rows.length === 1) {
        if (version.rows[0].version !== 1) throw new PersistenceError("Unsupported framework schema version.");
        return;
      }
      for (const ddl of this.statements.schema.slice(1)) await transaction.query(ddl, []);
      await transaction.query(this.statements.installSchemaVersion, []);
    });
  }
}
```

### `persistence/SqlExecutionRecordRepository.ts`

Saves validated records and command receipts atomically, rejects stale versions, and enforces its bound scope.

```typescript
import type { IExecutionRecordRepository } from "../contracts/persistence/IExecutionRecordRepository";
import type { IRecordCodec } from "../contracts/persistence/IRecordCodec";
import type { ExecutionRecord } from "../contracts/persistence/ExecutionRecord";
import type { StoredExecutionRecord } from "../contracts/persistence/StoredExecutionRecord";
import type { SaveExecutionRecord } from "../contracts/persistence/SaveExecutionRecord";
import type { SaveRecordReceipt } from "../contracts/persistence/SaveRecordReceipt";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import type { ISqlDatabase } from "./sql/ISqlDatabase";
import type { ISqlExecutor } from "./sql/ISqlExecutor";
import type { ExecutionRecordStatements } from "./sql/ExecutionRecordStatements";
import { PersistenceConflictError } from "../errors/PersistenceConflictError";
import { CommandIdentityConflictError } from "../errors/CommandIdentityConflictError";
import { InvalidPersistenceRecordError } from "../errors/InvalidPersistenceRecordError";

export class SqlExecutionRecordRepository implements IExecutionRecordRepository {
  private readonly scope: ExecutionScopeRef;
  constructor(
    private readonly database: ISqlDatabase,
    private readonly statements: ExecutionRecordStatements,
    private readonly codec: IRecordCodec<ExecutionRecord>,
    scope: ExecutionScopeRef,
  ) {
    if (!scope.scopeId?.trim() || !scope.projectId?.trim()) throw new InvalidPersistenceRecordError("Invalid repository scope.");
    this.scope = Object.freeze({ ...scope });
  }

  async load(executionId: string): Promise<StoredExecutionRecord | null> {
    this.requireId(executionId);
    return this.read(this.database, executionId);
  }

  async save(command: SaveExecutionRecord): Promise<SaveRecordReceipt> {
    const commandId = command.commandId;
    const expected = command.expectedVersion;
    this.requireId(commandId);
    if (!Number.isSafeInteger(expected) || expected < 0 ||
        !Number.isSafeInteger(expected + 1)) {
      throw new InvalidPersistenceRecordError("Invalid expected record version.");
    }
    // Capture a canonical immutable value before entering the database transaction.
    const payload = await this.codec.encode(command.record);
    const record = await this.codec.decode(payload);
    this.checkScope(record);
    const version = expected + 1;
    const executionId = record.lifecycle.executionId;
    const key = [this.scope.scopeId, this.scope.projectId, executionId];
    return this.database.transaction(async transaction => {
      const previous = await transaction.query(this.statements.selectReceipt, [...key, commandId]);
      if (previous.rows.length > 0) {
        const row = previous.rows[0];
        if (row.expected_version !== expected || row.payload !== payload) {
          throw new CommandIdentityConflictError("Save-command identity was reused for different data.");
        }
        if (row.record_version !== version) throw new InvalidPersistenceRecordError("Stored save receipt version is inconsistent.");
        return { stored: { recordVersion: this.version(row.record_version), record }, replayed: true };
      }
      const existing = await this.read(transaction, executionId);
      if ((existing?.recordVersion ?? 0) !== expected) throw new PersistenceConflictError("Record version changed.");
      if (existing !== null) this.checkHistory(existing.record, record);
      const result = existing === null
        ? await transaction.query(this.statements.insertRecord, [...key, version, payload])
        : await transaction.query(this.statements.updateRecord, [version, payload, ...key, expected]);
      if (result.affectedRows !== 1) throw new PersistenceConflictError("Compare-and-set write rejected.");
      await transaction.query(this.statements.insertReceipt, [...key, commandId, expected, version, payload]);
      return { stored: { recordVersion: version, record }, replayed: false };
    });
  }

  private async read(executor: ISqlExecutor, executionId: string): Promise<StoredExecutionRecord | null> {
    const result = await executor.query(this.statements.selectRecord, [this.scope.scopeId, this.scope.projectId, executionId]);
    if (result.rows.length === 0) return null;
    if (result.rows.length !== 1 || typeof result.rows[0].payload !== "string") {
      throw new InvalidPersistenceRecordError("Invalid stored execution row.");
    }
    const record = await this.codec.decode(result.rows[0].payload);
    this.checkScope(record);
    if (record.lifecycle.executionId !== executionId) throw new InvalidPersistenceRecordError("Stored key mismatch.");
    return Object.freeze({ recordVersion: this.version(result.rows[0].record_version), record });
  }

  private checkScope(record: ExecutionRecord): void {
    if (record.scope.scopeId !== this.scope.scopeId || record.scope.projectId !== this.scope.projectId ||
        record.scope.workspaceId !== this.scope.workspaceId) {
      throw new InvalidPersistenceRecordError("Execution record does not match repository scope.");
    }
  }
  private checkHistory(previous: ExecutionRecord, next: ExecutionRecord): void {
    if (JSON.stringify(previous.identity) !== JSON.stringify(next.identity) ||
        JSON.stringify(previous.definition) !== JSON.stringify(next.definition) ||
        JSON.stringify(previous.configuration) !== JSON.stringify(next.configuration) ||
        JSON.stringify(previous.registrations) !== JSON.stringify(next.registrations) ||
        previous.lifecycle.kind !== next.lifecycle.kind ||
        previous.lifecycle.definitionVersion !== next.lifecycle.definitionVersion ||
        previous.lifecycle.revision > next.lifecycle.revision ||
        (["completed", "failed", "stopped", "cancelled"].includes(previous.lifecycle.status) &&
          JSON.stringify(previous) !== JSON.stringify(next))) {
      throw new PersistenceConflictError("Immutable execution history or lifecycle revision changed.");
    }
  }
  private requireId(value: string): void {
    if (typeof value !== "string" || !value.trim()) throw new InvalidPersistenceRecordError("Expected a nonempty identifier.");
  }
  private version(value: unknown): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
      throw new InvalidPersistenceRecordError("Invalid stored record version.");
    }
    return value;
  }
}
```

### `persistence/PersistenceServices.ts`

Groups explicit schema initialization and the scope-bound record repository without starting either automatically.

```typescript
import type { IExecutionRecordRepository } from "../contracts/persistence/IExecutionRecordRepository";
import type { ExecutionRecordSchema } from "./ExecutionRecordSchema";

export type PersistenceServices = Readonly<{
  schema: ExecutionRecordSchema;
  records: IExecutionRecordRepository;
}>;
```

### `persistence/IPersistenceFactory.ts`

Defines construction of the configured persistence services without a provider switch.

```typescript
import type { PersistenceServices } from "./PersistenceServices";

export interface IPersistenceFactory {
  create(): PersistenceServices;
}
```

### `persistence/sqlite/SqlitePersistenceFactory.ts`

Composes the shared repository and schema initializer with the sqlite statements and a supplied real database binding.

```typescript
import type { IPersistenceFactory } from "../IPersistenceFactory";
import type { PersistenceServices } from "../PersistenceServices";
import type { ISqlDatabase } from "../sql/ISqlDatabase";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec";
import type { ExecutionRecord } from "../../contracts/persistence/ExecutionRecord";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import { ExecutionRecordSchema } from "../ExecutionRecordSchema";
import { SqlExecutionRecordRepository } from "../SqlExecutionRecordRepository";
import { sqliteExecutionRecordStatements } from "./sqliteExecutionRecordStatements";

export class SqlitePersistenceFactory implements IPersistenceFactory {
  constructor(
    private readonly database: ISqlDatabase,
    private readonly codec: IRecordCodec<ExecutionRecord>,
    private readonly scope: ExecutionScopeRef,
  ) {}

  create(): PersistenceServices {
    return Object.freeze({
      schema: new ExecutionRecordSchema(this.database, sqliteExecutionRecordStatements),
      records: new SqlExecutionRecordRepository(this.database, sqliteExecutionRecordStatements, this.codec, this.scope),
    });
  }
}
```

### `persistence/postgresql/PostgresqlPersistenceFactory.ts`

Composes the shared repository and schema initializer with the postgresql statements and a supplied real database binding.

```typescript
import type { IPersistenceFactory } from "../IPersistenceFactory";
import type { PersistenceServices } from "../PersistenceServices";
import type { ISqlDatabase } from "../sql/ISqlDatabase";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec";
import type { ExecutionRecord } from "../../contracts/persistence/ExecutionRecord";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import { ExecutionRecordSchema } from "../ExecutionRecordSchema";
import { SqlExecutionRecordRepository } from "../SqlExecutionRecordRepository";
import { postgresqlExecutionRecordStatements } from "./postgresqlExecutionRecordStatements";

export class PostgresqlPersistenceFactory implements IPersistenceFactory {
  constructor(
    private readonly database: ISqlDatabase,
    private readonly codec: IRecordCodec<ExecutionRecord>,
    private readonly scope: ExecutionScopeRef,
  ) {}

  create(): PersistenceServices {
    return Object.freeze({
      schema: new ExecutionRecordSchema(this.database, postgresqlExecutionRecordStatements),
      records: new SqlExecutionRecordRepository(this.database, postgresqlExecutionRecordStatements, this.codec, this.scope),
    });
  }
}
```

### `tests/fixtures/createExecutionRecord.ts`

Builds a controlled created-run record with illustrative configuration and no fabricated result or artifact.

```typescript
import type { ExecutionRecord } from "../../contracts/persistence/ExecutionRecord";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import { ExecutionLifecycle } from "../../domain/lifecycle/ExecutionLifecycle";
import { workflowRunLifecycle } from "../../domain/lifecycle/workflowRunLifecycle";

export function createExecutionRecord(scope: ExecutionScopeRef, executionId: string): ExecutionRecord {
  return {
    schemaVersion: 1, scope, identity: { operationId: `${executionId}-operation`, runId: executionId },
    lifecycle: ExecutionLifecycle.create(workflowRunLifecycle, executionId).snapshot(),
    definition: { id: "fixture-workflow", version: "1" },
    configuration: { logEnabled: false, logLevel: "info", maxIterations: 6, maxSubAgents: 2, maxSubAgentDepth: 1 },
    registrations: [], sourceRefs: ["fixture:source/code-r4"], checkpointRef: null, outcome: null,
  };
}
```

### `tests/persistence/IPersistenceTestHarness.ts`

Lets backend tests open, close, and reopen services against the same disposable real database.

```typescript
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import type { PersistenceServices } from "../../persistence/PersistenceServices";

export interface IPersistenceTestHarness {
  open(scope: ExecutionScopeRef): Promise<PersistenceServices>;
  close(): Promise<void>;
}
```

### `tests/persistence/ExecutionRecordRepository.test.ts`

Runs shared create, update, stale-write, scope, replay, and restart checks against an injected backend harness.

```typescript
import type { IPersistenceTestHarness } from "./IPersistenceTestHarness";
import type { ExecutionRecord } from "../../contracts/persistence/ExecutionRecord";
import { createExecutionRecord } from "../fixtures/createExecutionRecord";
import { ExecutionLifecycle } from "../../domain/lifecycle/ExecutionLifecycle";
import { workflowRunLifecycle } from "../../domain/lifecycle/workflowRunLifecycle";
import { PersistenceConflictError } from "../../errors/PersistenceConflictError";
import { CommandIdentityConflictError } from "../../errors/CommandIdentityConflictError";

export async function verifyExecutionRecordRepository(harness: IPersistenceTestHarness): Promise<void> {
  const scope = { scopeId: "fixture-scope", projectId: "fixture-project" };
  try {
    const services = await harness.open(scope);
    await services.schema.initialize();
    await services.schema.initialize();
    const initial = createExecutionRecord(scope, "fixture-run");
    const created = await services.records.save({ commandId: "create-1", expectedVersion: 0, record: initial });
    const replay = await services.records.save({ commandId: "create-1", expectedVersion: 0, record: initial });
    if (created.stored.recordVersion !== 1 || created.replayed || !replay.replayed) throw new Error("Create/replay failed.");
    const lifecycle = await ExecutionLifecycle.restore(workflowRunLifecycle, initial.lifecycle);
    lifecycle.transition("active");
    const active = { ...initial, lifecycle: lifecycle.snapshot() };
    const updated = await services.records.save({ commandId: "activate-1", expectedVersion: 1, record: active });
    if (updated.stored.recordVersion !== 2) throw new Error("Update version failed.");
    let stale = false;
    try { await services.records.save({ commandId: "stale-1", expectedVersion: 1, record: active }); }
    catch (error: unknown) { if (!(error instanceof PersistenceConflictError)) throw error; stale = true; }
    if (!stale) throw new Error("Stale update accepted.");
    let reused = false;
    try { await services.records.save({ commandId: "activate-1", expectedVersion: 1, record: initial }); }
    catch (error: unknown) { if (!(error instanceof CommandIdentityConflictError)) throw error; reused = true; }
    if (!reused) throw new Error("Command ID reuse accepted.");
    const races = await Promise.allSettled([
      services.records.save({ commandId: "writer-a", expectedVersion: 2, record: active }),
      services.records.save({ commandId: "writer-b", expectedVersion: 2, record: active }),
    ]);
    if (races.filter(result => result.status === "fulfilled").length !== 1 ||
        races.filter(result => result.status === "rejected" && result.reason instanceof PersistenceConflictError).length !== 1) {
      throw new Error("Concurrent stale writers must not both commit.");
    }
    lifecycle.transition("stopped");
    const stopped: ExecutionRecord = {
      ...active, lifecycle: lifecycle.snapshot(),
      outcome: {
        status: "stopped", reason: { code: "limit-reached", message: "Fixture iteration limit." },
        partial: { summary: "Inspected sessions.", evidenceRefs: ["fixture:source/code-r4"],
          artifactRefs: [], unresolved: ["Expiry not checked."] },
        pendingOperationRefs: [],
      },
    };
    await services.records.save({ commandId: "stop-1", expectedVersion: 3, record: stopped });
    const foreign = await harness.open({ scopeId: "other-scope", projectId: "fixture-project" });
    if (await foreign.records.load("fixture-run") !== null) throw new Error("Scope isolation failed.");
    await harness.close();
    const reopened = await harness.open(scope);
    await reopened.schema.initialize();
    const restored = await reopened.records.load("fixture-run");
    if (restored?.recordVersion !== 4 || restored.record.lifecycle.status !== "stopped" ||
        restored.record.outcome?.status !== "stopped" || restored.record.outcome.partial.unresolved[0] !== "Expiry not checked.") {
      throw new Error("Restart must preserve stopped status and partial findings.");
    }
    const lateReplay = await reopened.records.save({ commandId: "create-1", expectedVersion: 0, record: initial });
    if (!lateReplay.replayed || lateReplay.stored.recordVersion !== 1 ||
        (await reopened.records.load("fixture-run"))?.recordVersion !== 4) throw new Error("Replay corrupted current state.");
  } finally { await harness.close(); }
}
```

### `tests/persistence/JsonRecordCodec.test.ts`

Checks round-trip validation, canonical bytes, source preservation, unsupported data, byte limits, and invalid lifecycle ownership.

```typescript
import { JsonValueContract } from "../../persistence/JsonValueContract";
import { JsonRecordCodec } from "../../persistence/JsonRecordCodec";
import { ExecutionRecordContract } from "../../persistence/ExecutionRecordContract";
import { ExecutionIdentityContract } from "../../contracts/runtime/ExecutionIdentityContract";
import { FrameworkConfigurationContract } from "../../configuration/FrameworkConfigurationContract";
import { InvalidPersistenceRecordError } from "../../errors/InvalidPersistenceRecordError";
import { createExecutionRecord } from "../fixtures/createExecutionRecord";

export async function verifyRecordCodec(): Promise<void> {
  const json = new JsonValueContract();
  const contract = new ExecutionRecordContract(json, new ExecutionIdentityContract(), new FrameworkConfigurationContract());
  const codec = new JsonRecordCodec(contract, json, 65536);
  const fixture = createExecutionRecord({ scopeId: "scope-codec", projectId: "project-codec" }, "codec-run");
  const encoded = await codec.encode(fixture);
  const decoded = await codec.decode(encoded);
  if (decoded.sourceRefs[0] !== "fixture:source/code-r4" || await codec.encode(decoded) !== encoded ||
      !Object.isFrozen(decoded.lifecycle.pendingOperationRefs)) throw new Error("Canonical immutable round trip failed.");
  const cyclic: { self?: unknown } = {}; cyclic.self = cyclic;
  let getterCalled = false;
  const arrayGetter: unknown[] = [];
  Object.defineProperty(arrayGetter, "0", { enumerable: true, get: () => { getterCalled = true; return 1; } });
  for (const invalid of [cyclic, { bad: undefined }, { bad: NaN }, new Date(), { bad: () => 1 },
    arrayGetter, new Array(2)]) {
    if ((await json.validate(invalid)).valid) throw new Error("Unsupported JSON accepted.");
  }
  if (getterCalled) throw new Error("JSON validation must not execute array getters.");
  for (const invalid of [
    { ...fixture, identity: { operationId: "op-other", runId: "another-run" } },
    { ...fixture, lifecycle: { ...fixture.lifecycle, status: "completed" } },
    { ...fixture, configuration: { ...fixture.configuration, maxIterations: -1 } },
  ]) {
    let rejected = false;
    try { await codec.encode(invalid); }
    catch (error: unknown) { if (!(error instanceof InvalidPersistenceRecordError)) throw error; rejected = true; }
    if (!rejected) throw new Error("Invalid record accepted.");
  }
  let oversized = false;
  try { await new JsonRecordCodec(contract, json, 10).encode(fixture); }
  catch (error: unknown) { if (!(error instanceof InvalidPersistenceRecordError)) throw error; oversized = true; }
  if (!oversized) throw new Error("Byte limit was ignored.");
}
```

### `tests/persistence/SqlitePersistence.test.ts`

Runs the shared repository checks against a disposable real Sqlite binding; an in-memory mock does not satisfy this check.

```typescript
import type { IPersistenceTestHarness } from "./IPersistenceTestHarness";
import { verifyExecutionRecordRepository } from "./ExecutionRecordRepository.test";

export async function verifySqlitePersistence(harness: IPersistenceTestHarness): Promise<void> {
  await verifyExecutionRecordRepository(harness);
}
```

### `tests/persistence/PostgresqlPersistence.test.ts`

Runs the shared repository checks against a disposable real Postgresql binding; an in-memory mock does not satisfy this check.

```typescript
import type { IPersistenceTestHarness } from "./IPersistenceTestHarness";
import { verifyExecutionRecordRepository } from "./ExecutionRecordRepository.test";

export async function verifyPostgresqlPersistence(harness: IPersistenceTestHarness): Promise<void> {
  await verifyExecutionRecordRepository(harness);
}
```

### `examples/persistence/main.ts`

Saves a created record, advances it, then reloads and restores the lifecycle through a supplied SQLite database binding.

```typescript
import type { ISqlDatabase } from "../../index";
import {
  JsonValueContract, JsonRecordCodec, ExecutionRecordContract, ExecutionIdentityContract,
  FrameworkConfigurationContract, SqlitePersistenceFactory, ExecutionLifecycle, workflowRunLifecycle,
} from "../../index";
import type { ExecutionRecord } from "../../index";

export async function runPersistenceExample(database: ISqlDatabase): Promise<void> {
  const scope = { scopeId: "example-scope", projectId: "example-project" };
  const json = new JsonValueContract();
  const codec = new JsonRecordCodec(new ExecutionRecordContract(
    json, new ExecutionIdentityContract(), new FrameworkConfigurationContract(),
  ), json, 65536);
  const services = new SqlitePersistenceFactory(database, codec, scope).create();
  await services.schema.initialize();
  const lifecycle = ExecutionLifecycle.create(workflowRunLifecycle, "example-run");
  const record: ExecutionRecord = {
    schemaVersion: 1, scope, identity: { operationId: "example-operation", runId: "example-run" },
    lifecycle: lifecycle.snapshot(), definition: { id: "example-workflow", version: "1" },
    configuration: { logEnabled: false, logLevel: "info", maxIterations: 6, maxSubAgents: 2, maxSubAgentDepth: 1 },
    registrations: [], sourceRefs: [], checkpointRef: null, outcome: null,
  };
  await services.records.save({ commandId: "create-example", expectedVersion: 0, record });
  lifecycle.transition("active");
  await services.records.save({ commandId: "start-example", expectedVersion: 1, record: { ...record, lifecycle: lifecycle.snapshot() } });
  const loaded = await services.records.load("example-run");
  if (loaded === null) throw new Error("Expected saved example record.");
  const restored = await ExecutionLifecycle.restore(workflowRunLifecycle, loaded.record.lifecycle);
  console.log({ recordVersion: loaded.recordVersion, restored: restored.snapshot() });
}
```

### `index.ts`

Adds the persistence public API while retaining prior exports; SQL strings, test fixtures, and internal repository wiring stay private.

```typescript
export type { JsonValue } from "./contracts/persistence/JsonValue";
export type { ExecutionRecord } from "./contracts/persistence/ExecutionRecord";
export type { StoredExecutionRecord } from "./contracts/persistence/StoredExecutionRecord";
export type { SaveExecutionRecord } from "./contracts/persistence/SaveExecutionRecord";
export type { SaveRecordReceipt } from "./contracts/persistence/SaveRecordReceipt";
export type { IExecutionRecordRepository } from "./contracts/persistence/IExecutionRecordRepository";
export type { IRecordCodec } from "./contracts/persistence/IRecordCodec";
export { JsonValueContract } from "./persistence/JsonValueContract";
export { ExecutionRecordContract } from "./persistence/ExecutionRecordContract";
export { JsonRecordCodec } from "./persistence/JsonRecordCodec";
export type { ISqlExecutor } from "./persistence/sql/ISqlExecutor";
export type { ISqlDatabase } from "./persistence/sql/ISqlDatabase";
export type { SqlValue } from "./persistence/sql/SqlValue";
export type { SqlResult } from "./persistence/sql/SqlResult";
export type { PersistenceServices } from "./persistence/PersistenceServices";
export type { IPersistenceFactory } from "./persistence/IPersistenceFactory";
export { SqlitePersistenceFactory } from "./persistence/sqlite/SqlitePersistenceFactory";
export { PostgresqlPersistenceFactory } from "./persistence/postgresql/PostgresqlPersistenceFactory";
export { InvalidPersistenceRecordError } from "./errors/InvalidPersistenceRecordError";
export { PersistenceConflictError } from "./errors/PersistenceConflictError";
export { CommandIdentityConflictError } from "./errors/CommandIdentityConflictError";
```

### `tests/contracts/PersistenceApi.compile.ts`

Checks public record, codec, SQL binding, factory, and error exports without opening a database.

```typescript
import type {
  JsonValue, ExecutionRecord, StoredExecutionRecord, SaveExecutionRecord, SaveRecordReceipt,
  IExecutionRecordRepository, IRecordCodec, ISqlExecutor, ISqlDatabase, SqlValue, SqlResult,
  PersistenceServices, IPersistenceFactory,
} from "../../index";
import {
  JsonValueContract, ExecutionRecordContract, JsonRecordCodec, SqlitePersistenceFactory,
  PostgresqlPersistenceFactory, InvalidPersistenceRecordError, PersistenceConflictError, CommandIdentityConflictError,
} from "../../index";

export type PersistenceApiFixture = Readonly<{
  json: JsonValue; record: ExecutionRecord; stored: StoredExecutionRecord;
  command: SaveExecutionRecord; receipt: SaveRecordReceipt; repository: IExecutionRecordRepository;
  codec: IRecordCodec<ExecutionRecord>; executor: ISqlExecutor; database: ISqlDatabase;
  parameter: SqlValue; result: SqlResult; services: PersistenceServices; factory: IPersistenceFactory;
  jsonContract: typeof JsonValueContract; recordContract: typeof ExecutionRecordContract;
  codecClass: typeof JsonRecordCodec; sqliteFactory: typeof SqlitePersistenceFactory;
  postgresqlFactory: typeof PostgresqlPersistenceFactory;
  invalid: typeof InvalidPersistenceRecordError; conflict: typeof PersistenceConflictError;
  reused: typeof CommandIdentityConflictError;
}>;
```
