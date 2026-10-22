# 14. Workspaces and Sequential Editing

## What We Implement Here

Create isolated text workspaces with immutable baselines, scoped file access, versioned replacements, and durable exclusive editing ownership. Make editing sub-agents work sequentially by default and reject stale writes. Implement a SQL text provider and connect its bounded source reads to the existing tool contract; original source files and publication remain outside this editing boundary.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `workspaces/WorkspaceHandle.ts` | `type WorkspaceHandle` |
| `workspaces/WorkspaceSeedFile.ts` | `type WorkspaceSeedFile` |
| `workspaces/WorkspaceFileSnapshot.ts` | `type WorkspaceFileSnapshot` |
| `workspaces/WorkspaceReplaceResult.ts` | `type WorkspaceReplaceResult` |
| `errors/WorkspaceOperationError.ts` | `class WorkspaceOperationError extends Error` |
| `workspaces/WorkspaceBoundary.ts` | `class WorkspaceBoundary` |
| `workspaces/IWorkspaceProvider.ts` | `interface IWorkspaceProvider` |
| `workspaces/IWorkspaceFiles.ts` | `interface IWorkspaceFiles` |
| `workspaces/IWorkspaceEditGate.ts` | `interface IWorkspaceEditGate` |
| `workspaces/WorkspaceStatements.ts` | `type WorkspaceStatements` |
| `workspaces/sqliteWorkspaceStatements.ts` | `const sqliteWorkspaceStatements` |
| `workspaces/postgresqlWorkspaceStatements.ts` | `const postgresqlWorkspaceStatements` |
| `workspaces/SqlTextWorkspaceProvider.ts` | `class SqlTextWorkspaceProvider implements IWorkspaceProvider` |
| `workspaces/SqlWorkspaceFiles.ts` | `class SqlWorkspaceFiles implements IWorkspaceFiles` |
| `workspaces/SqlWorkspaceEditGate.ts` | `class SqlWorkspaceEditGate implements IWorkspaceEditGate` |
| `workspaces/WorkspaceEditSession.ts` | `class WorkspaceEditSession` |
| `workspaces/WorkspaceEditingOutcome.ts` | `type WorkspaceEditingOutcome<TValue>` |
| `workspaces/SequentialWorkspaceEditor.ts` | `class SequentialWorkspaceEditor` |
| `workspaces/WorkspaceSourceReader.ts` | `class WorkspaceSourceReader implements IScopedSourceReader` |
| `tests/workspaces/IWorkspaceTestHarness.ts` | `interface IWorkspaceTestHarness` |
| `tests/workspaces/checkWorkspaceIsolation.ts` | `function checkWorkspaceIsolation` |
| `examples/workspaces/LoginSequentialEditingExample.ts` | `class LoginSequentialEditingExample` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [page 01](01-scope-and-implementation-roadmap.md) and [page 02](02-package-structure-and-oop-conventions.md) for the general OOP, file, naming, and writing rules. Every class/interface has its own matching file; interface names start with `I`. Reuse existing scope/context/control/SQL and source-reader contracts. Workspace enforcement is a capability boundary, not a model recommendation policy.
- The concrete provider here is an isolated **SQL-backed regular UTF-8 text workspace**. It copies an explicit authorized source snapshot into framework-owned tables; editing those rows never edits the original source directory. It supports text reads, additions, replacements, and deletions with retained revisions. It does not claim Git worktree/clone creation, filesystem materialization, binary/executable/symlink support, shell execution, or a working compiler/test checkout. Those need separately implemented providers/adapters. Do not register these unsupported capabilities merely because an interface exists.
- `SqlTextWorkspaceProvider` receives source files from a trusted host capture operation. That capture must bind the baseline reference to the actual source revision/dirty/untracked inclusion rules and authorize every included path; a caller-supplied label alone proves none of that. The provider validates canonical paths, rejects duplicate files, limits the seed to 256 files/64 KiB each/1 MiB total, and commits workspace creation plus all seed rows together. Initial baseline content stays immutable when working content changes. Creation uses a new identity; repeating it is not an idempotent recovery protocol and must not overwrite an existing workspace.
- Treat `WorkspaceHandle` as a reference resolved by trusted composition, not as a bearer token or permission grant. On resume, resolve authenticated scope/project/workspace identity and baseline against current durable metadata before injecting file/gate services. Agent-supplied handles must never be passed directly to constructors backed by unrestricted database access. `SqlWorkspaceFiles` checks stored baseline, provider/schema version, and matching workspace identity on use. It does not authenticate a user merely because they supplied valid IDs.
- `WorkspaceBoundary` permits explicit exact relative file paths, using a conservative portable ASCII path subset. Reject absolute paths, traversal components, backslashes, control characters, duplicate separators, and `.git` components. No glob or prefix-based write grant is inferred. Read and write sets are independent; replacement requires both because a conflict receipt can expose current content. Additions must be explicitly listed in the writable and readable sets, including currently absent paths.
- The SQL provider has no symlinks to follow: path strings name scoped database rows only. This lexical check is not a secure native-filesystem sandbox. A future filesystem adapter must protect canonical roots and every actual operation against symlink/parent replacement races, reject unsupported file kinds, define platform case/mode behavior, and avoid unrestricted subprocess paths. Do not advertise such an adapter until those guarantees and tests exist.
- Reads require current read scope and bound UTF-8 data in SQL before transferring content. Missing files return `text: null` and `revision: null`; deleted files return null text with a retained non-null revision. A file exceeding the requested read bound fails visibly; it is not silently truncated. The SQL binding must normalize integer/aggregate columns to safe JavaScript numbers, as in page 06. Strings reject NUL and lone surrogate code units; no silent lossy binary conversion is supported.
- `SqlWorkspaceFiles.replace()` holds an owner-row lock, checks the expected revision, verifies durable workspace quotas, and writes within one pinned transaction. An absent row can be added only with expected revision null. Existing/tombstoned rows require the exact retained revision. A stale expectation returns `applied: false` with the current scoped snapshot; do not automatically overwrite or retry using its new revision without inspecting current work. Revisions increase and never reset after delete/recreate, preventing an old absence observation from matching a later state.
- A workspace retains at most 256 file rows, including tombstones, and at most 1 MiB of current text. Each file is additionally bounded by its injected boundary, at most 64 KiB. Baseline text is immutable and separately bounded at creation. These are explicit reference-implementation limits, not universal recommended defaults. Tombstones are not deleted to manufacture quota. Any future compaction must preserve revision/conflict and baseline guarantees. Quota checks and updates run under the same gate-owner lock as the file mutation.
- `SqlWorkspaceEditGate` admits one owner for the whole scoped workspace. Use the same database/key across all parent/child workers sharing it; separate in-memory gates would not coordinate processes. Acquisition is atomic and non-waiting: a competing editor receives busy, not an unbounded internal queue. Release requires the exact owner token. Do not expire or steal a lock based only on elapsed time, a cancelled caller, or a supposedly dead session. A crash can leave a durable held gate; the recovery owner must prove old I/O is quiescent and reconcile effects before authorizing recovery.
- `SequentialWorkspaceEditor` holds the gate over the whole editing callback, including reads used to plan edits and all tracked writes. Scope must match the handle. It checks cancellation/deadline before admission and at each session action, then drains writes before release. At most 64 actions are allowed in a session. A callback exception is not proof earlier writes rolled back: separate committed writes remain and must appear in collected work/partial outcomes. Failure to drain or release stays observable and may leave the gate held for recovery; do not report an available workspace without a verified release.
- Never race the actual editing callback against a timeout and release its gate when only the caller stopped waiting. The page-13 runner may stop waiting and signal abort, but this editing owner must keep ownership until its callback and started writes settle. `WorkspaceEditSession` rejects actions after closure and drains even detached writes before release. Trusted callbacks must still await their operations and stay bounded; no timer can interrupt synchronous blocking host code. If an underlying transaction's outcome/quiescence is unknown, preserve the gate rather than assuming another editor can safely start.
- Sequential editing is the default for editing sub-agents. Example: child A reads `login.ts`, edits it, and ends its editing scope; child B then reads A's latest revision before making its own change. Two separate session IDs do not prevent both children from reading the same old file. If B tries its old expected revision, CAS rejects it. Actual parallel editing requires separate isolated workspaces plus an explicit conflict-aware merge/review path; this page does not implement that merge or let disjoint-looking requests bypass the gate.
- Read-only workers do not acquire the editing gate. A read is one versioned snapshot, not a guarantee that several reads observe one unchanged tree. If an investigation/review needs a consistent multi-file snapshot, capture/freeze a bounded snapshot or coordinate through an explicit reader/verification owner. Do not claim a source revision is still current merely because a prior file read succeeded.
- `WorkspaceSourceReader` implements page 13's `IScopedSourceReader` using a bounded host-authorized reference-to-path map. Unknown references fail; references do not resolve arbitrary filesystem paths. It forwards the requested byte bound to SQL, checks cancellation before/after reading, and rejects absent files. Scope is enforced by its already scoped file service and boundary. Inject this reader into `ReadSourceTool`; a future editing tool similarly invokes the sequential editor through scoped capability objects, not raw SQL or the original source root.
- File operations do not themselves consume a model call. Tool invocations still go through page-13 validation, authorization, journals, and tool-call budget; gate ownership does not replace those controls. Operation IDs, session IDs, gate-owner tokens, workspace IDs, file revisions, and baseline references have different roles. Persist them through the owning runtime and never infer task completion from a successful file replacement.
- Source baseline and working content are not a publication approval. Continued work stays isolated. The later change-set/review/publication owner must compare exact baseline/working/target states, freeze proposed additions/edits/deletions, enforce explicit approval and target conflict checks, and record actual publication receipts. No full-directory overwrite, original-directory mutation, Git push, PR merge, or deployment is implemented or implied by this page.
- SQL schema initialization uses the page-06 cross-worker migration lock and fixed version-1 tables. Add explicit migrations and compatibility checks before incompatible changes. Do not recreate/reset workspaces, counters, tombstones, or held gates on startup. Retention must protect active/uncertain work and baseline provenance; cleanup is a separately authorized lifecycle operation, not a helper that recursively deletes arbitrary roots.
- Optional tracing records safe workspace/session/operation IDs, gate status, revision conflicts, and bounded byte counts. Do not log source text, raw paths outside authorized metadata rules, credentials, or handoff contents. Required workspace/gate state is independent of optional logging. Cancellation/failure preserves committed edits, unresolved operations, and recovery references in explicit partial outcomes rather than claiming nothing changed.
- Acceptance checks cover source/working-copy isolation, independent copies, atomic seed failure, scoped reads/writes, traversal denial, requested read-byte bounds, quotas, competing gate acquisition, owner-token enforcement, stale revision rejection, delete/recreate ABA prevention, held-gate restart behavior, tracked-write draining, sequential login edits, cancellation/deadline, and post-close action rejection. Run real-backend checks for both SQLite and PostgreSQL before claiming both bindings verified; fake/in-memory tests cannot establish cross-process or durable guarantees. No paid model calls or real source-directory edits are required.

## TypeScript Code for Each File

### `workspaces/WorkspaceHandle.ts`

Identifies an isolated text workspace and its immutable baseline without exposing an original filesystem root.

```typescript
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
export type WorkspaceHandle = Readonly<{ schemaVersion: 1; workspaceId: string; baselineRef: string; scope: ExecutionScopeRef; providerId: "sql-text" }>;
```

### `workspaces/WorkspaceSeedFile.ts`

Supplies one explicitly included regular UTF-8 source file captured by an authorized host snapshot reader.

```typescript
export type WorkspaceSeedFile = Readonly<{ path: string; text: string }>;
```

### `workspaces/WorkspaceFileSnapshot.ts`

Returns a versioned text file or absence; deleted rows retain revisions to prevent stale recreation.

```typescript
export type WorkspaceFileSnapshot = Readonly<{ path: string; revision: number | null; text: string | null }>;
```

### `workspaces/WorkspaceReplaceResult.ts`

Separates a committed replacement from a stale expected revision without automatically retrying the write.

```typescript
import type { WorkspaceFileSnapshot } from "./WorkspaceFileSnapshot";
export type WorkspaceReplaceResult = Readonly<{ applied: boolean; snapshot: WorkspaceFileSnapshot }>;
```

### `errors/WorkspaceOperationError.ts`

Reports invalid scope, path, snapshot, ownership, or workspace state with a fixed safe message.

```typescript
export class WorkspaceOperationError extends Error {
  readonly code = "WORKSPACE_OPERATION_INVALID";
  constructor() { super("Workspace scope, path, revision, or editing ownership is invalid."); this.name = "WorkspaceOperationError"; }
}
```

### `workspaces/WorkspaceBoundary.ts`

Validates canonical relative paths and exact permitted file sets; it grants no unrestricted directory or shell access.

```typescript
import { WorkspaceOperationError } from "../errors/WorkspaceOperationError";
export class WorkspaceBoundary {
  private readonly readable: ReadonlySet<string>;
  private readonly writable: ReadonlySet<string>;
  constructor(readable: readonly string[], writable: readonly string[], readonly maxFileBytes: number) {
    if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes < 1 || maxFileBytes > 65536 || readable.length > 256 || writable.length > 256) throw new WorkspaceOperationError();
    for (const path of [...readable, ...writable]) this.validatePath(path);
    this.readable = new Set(readable); this.writable = new Set(writable);
  }
  validatePath(path: string): void {
    if (typeof path !== "string" || new TextEncoder().encode(path).byteLength > 256 || !/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(path) ||
        path.split("/").some(part => part === "." || part === ".." || part.toLowerCase() === ".git")) throw new WorkspaceOperationError();
  }
  requireRead(path: string): void { this.validatePath(path); if (!this.readable.has(path)) throw new WorkspaceOperationError(); }
  requireWrite(path: string): void { this.validatePath(path); if (!this.writable.has(path)) throw new WorkspaceOperationError(); }
  validateText(text: string): void { if (typeof text !== "string" || text.includes("\u0000") || /[\uD800-\uDFFF]/u.test(text) || new TextEncoder().encode(text).byteLength > this.maxFileBytes) throw new WorkspaceOperationError(); }
}
```

### `workspaces/IWorkspaceProvider.ts`

Creates one isolated working workspace from a bounded explicit source snapshot and baseline reference.

```typescript
import type { WorkspaceHandle } from "./WorkspaceHandle";
import type { WorkspaceSeedFile } from "./WorkspaceSeedFile";
export interface IWorkspaceProvider { create(workspaceId: string, baselineRef: string, files: readonly WorkspaceSeedFile[]): Promise<WorkspaceHandle>; }
```

### `workspaces/IWorkspaceFiles.ts`

Exposes bounded reads and owner-bound compare-and-swap replacement; there is no direct publish-to-source method.

```typescript
import type { WorkspaceFileSnapshot } from "./WorkspaceFileSnapshot";
import type { WorkspaceReplaceResult } from "./WorkspaceReplaceResult";
export interface IWorkspaceFiles {
  read(path: string, maxBytes?: number): Promise<WorkspaceFileSnapshot>;
  replace(ownerToken: string, path: string, expectedRevision: number | null, text: string | null): Promise<WorkspaceReplaceResult>;
}
```

### `workspaces/IWorkspaceEditGate.ts`

Controls exclusive editing for the entire scoped workspace, rather than trusting session separation to avoid conflicts.

```typescript
export interface IWorkspaceEditGate { acquire(ownerToken: string): Promise<boolean>; release(ownerToken: string): Promise<void>; }
```

### `workspaces/WorkspaceStatements.ts`

Injects fixed backend SQL for workspace creation, file snapshots, revision checks, and durable editing ownership.

```typescript
export type WorkspaceStatements = Readonly<{
  quota: string; schema: readonly string[]; createWorkspace: string; workspace: string; seed: string; read: string;
  acquire: string; release: string; assertOwner: string; insertFile: string; updateFile: string;
}>;
```

### `workspaces/sqliteWorkspaceStatements.ts`

Defines parameterized sqlite workspace and editing-gate statements, including permanent file tombstones.

```typescript
import type { WorkspaceStatements } from "./WorkspaceStatements";
export const sqliteWorkspaceStatements: WorkspaceStatements = Object.freeze({
  "schema": [
    "CREATE TABLE IF NOT EXISTS kushibot_workspaces_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_id TEXT NOT NULL, baseline_ref TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, workspace_id))",
    "CREATE TABLE IF NOT EXISTS kushibot_workspace_files_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_id TEXT NOT NULL, path TEXT NOT NULL, revision BIGINT NOT NULL, content TEXT, baseline_content TEXT, PRIMARY KEY (scope_id, project_id, workspace_id, path))",
    "CREATE TABLE IF NOT EXISTS kushibot_workspace_edit_gates_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_id TEXT NOT NULL, owner_token TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, workspace_id))"
  ],
  "createWorkspace": "INSERT INTO kushibot_workspaces_v1 (scope_id, project_id, workspace_id, baseline_ref) VALUES (?, ?, ?, ?)",
  "workspace": "SELECT baseline_ref FROM kushibot_workspaces_v1 WHERE scope_id = ? AND project_id = ? AND workspace_id = ?",
  "seed": "INSERT INTO kushibot_workspace_files_v1 (scope_id, project_id, workspace_id, path, revision, content, baseline_content) VALUES (?, ?, ?, ?, 0, ?, ?)",
  "read": "SELECT revision, CASE WHEN length(CAST(content AS BLOB)) <= ? THEN content ELSE NULL END AS content, CASE WHEN length(CAST(content AS BLOB)) > ? THEN 1 ELSE 0 END AS too_large FROM kushibot_workspace_files_v1 WHERE scope_id = ? AND project_id = ? AND workspace_id = ? AND path = ?",
  "acquire": "INSERT INTO kushibot_workspace_edit_gates_v1 (scope_id, project_id, workspace_id, owner_token) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
  "release": "DELETE FROM kushibot_workspace_edit_gates_v1 WHERE scope_id = ? AND project_id = ? AND workspace_id = ? AND owner_token = ?",
  "assertOwner": "UPDATE kushibot_workspace_edit_gates_v1 SET owner_token = owner_token WHERE scope_id = ? AND project_id = ? AND workspace_id = ? AND owner_token = ?",
  "insertFile": "INSERT INTO kushibot_workspace_files_v1 (scope_id, project_id, workspace_id, path, revision, content, baseline_content) VALUES (?, ?, ?, ?, 0, ?, NULL)",
  "updateFile": "UPDATE kushibot_workspace_files_v1 SET revision = ?, content = ? WHERE scope_id = ? AND project_id = ? AND workspace_id = ? AND path = ? AND revision = ?" ,
  "quota": "SELECT COUNT(*) AS file_count, COALESCE(SUM(length(CAST(content AS BLOB))), 0) AS content_bytes FROM kushibot_workspace_files_v1 WHERE scope_id = ? AND project_id = ? AND workspace_id = ?"
});
```

### `workspaces/postgresqlWorkspaceStatements.ts`

Defines parameterized postgresql workspace and editing-gate statements, including permanent file tombstones.

```typescript
import type { WorkspaceStatements } from "./WorkspaceStatements";
export const postgresqlWorkspaceStatements: WorkspaceStatements = Object.freeze({
  "schema": [
    "CREATE TABLE IF NOT EXISTS kushibot_workspaces_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_id TEXT NOT NULL, baseline_ref TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, workspace_id))",
    "CREATE TABLE IF NOT EXISTS kushibot_workspace_files_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_id TEXT NOT NULL, path TEXT NOT NULL, revision BIGINT NOT NULL, content TEXT, baseline_content TEXT, PRIMARY KEY (scope_id, project_id, workspace_id, path))",
    "CREATE TABLE IF NOT EXISTS kushibot_workspace_edit_gates_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_id TEXT NOT NULL, owner_token TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, workspace_id))"
  ],
  "createWorkspace": "INSERT INTO kushibot_workspaces_v1 (scope_id, project_id, workspace_id, baseline_ref) VALUES ($1, $2, $3, $4)",
  "workspace": "SELECT baseline_ref FROM kushibot_workspaces_v1 WHERE scope_id = $1 AND project_id = $2 AND workspace_id = $3",
  "seed": "INSERT INTO kushibot_workspace_files_v1 (scope_id, project_id, workspace_id, path, revision, content, baseline_content) VALUES ($1, $2, $3, $4, 0, $5, $6)",
  "read": "SELECT revision, CASE WHEN octet_length(content) <= $1 THEN content ELSE NULL END AS content, CASE WHEN octet_length(content) > $2 THEN 1 ELSE 0 END AS too_large FROM kushibot_workspace_files_v1 WHERE scope_id = $3 AND project_id = $4 AND workspace_id = $5 AND path = $6",
  "acquire": "INSERT INTO kushibot_workspace_edit_gates_v1 (scope_id, project_id, workspace_id, owner_token) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
  "release": "DELETE FROM kushibot_workspace_edit_gates_v1 WHERE scope_id = $1 AND project_id = $2 AND workspace_id = $3 AND owner_token = $4",
  "assertOwner": "UPDATE kushibot_workspace_edit_gates_v1 SET owner_token = owner_token WHERE scope_id = $1 AND project_id = $2 AND workspace_id = $3 AND owner_token = $4",
  "insertFile": "INSERT INTO kushibot_workspace_files_v1 (scope_id, project_id, workspace_id, path, revision, content, baseline_content) VALUES ($1, $2, $3, $4, 0, $5, NULL)",
  "updateFile": "UPDATE kushibot_workspace_files_v1 SET revision = $1, content = $2 WHERE scope_id = $3 AND project_id = $4 AND workspace_id = $5 AND path = $6 AND revision = $7" ,
  "quota": "SELECT COUNT(*) AS file_count, COALESCE(SUM(octet_length(content)), 0) AS content_bytes FROM kushibot_workspace_files_v1 WHERE scope_id = $1 AND project_id = $2 AND workspace_id = $3"
});
```

### `workspaces/SqlTextWorkspaceProvider.ts`

Copies an explicitly supplied source snapshot into an isolated SQL text workspace; creation and seeding commit together.

```typescript
import type { IWorkspaceProvider } from "./IWorkspaceProvider";
import type { WorkspaceHandle } from "./WorkspaceHandle";
import type { WorkspaceSeedFile } from "./WorkspaceSeedFile";
import type { WorkspaceStatements } from "./WorkspaceStatements";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import { WorkspaceBoundary } from "./WorkspaceBoundary";
import { WorkspaceOperationError } from "../errors/WorkspaceOperationError";
export class SqlTextWorkspaceProvider implements IWorkspaceProvider {
  private readonly scope: ExecutionScopeRef;
  constructor(private readonly db: ISqlDatabase, private readonly sql: WorkspaceStatements, scope: ExecutionScopeRef) { this.scope = Object.freeze({ ...scope }); }
  async initialize(): Promise<void> { await this.db.migrationTransaction(async tx => { for (const statement of this.sql.schema) await tx.query(statement, []); }); }
  async create(workspaceId: string, baselineRef: string, input: readonly WorkspaceSeedFile[]): Promise<WorkspaceHandle> {
    if (![workspaceId, baselineRef, this.scope.scopeId, this.scope.projectId].every(value => typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,128}$/.test(value)) || !Array.isArray(input) || input.length > 256) throw new WorkspaceOperationError();
    const boundary = new WorkspaceBoundary([], [], 65536); const files = input.map(file => Object.freeze({ path: file.path, text: file.text }));
    let bytes = 0;
    for (const file of files) { boundary.validatePath(file.path); boundary.validateText(file.text); bytes += new TextEncoder().encode(file.text).byteLength; }
    if (bytes > 1048576 || new Set(files.map(file => file.path)).size !== files.length) throw new WorkspaceOperationError();
    const scope = Object.freeze({ scopeId: this.scope.scopeId, projectId: this.scope.projectId, workspaceId });
    await this.db.transaction(async tx => {
      await tx.query(this.sql.createWorkspace, [scope.scopeId, scope.projectId, workspaceId, baselineRef]);
      for (const file of files) await tx.query(this.sql.seed, [scope.scopeId, scope.projectId, workspaceId, file.path, file.text, file.text]);
    });
    return Object.freeze({ schemaVersion: 1, workspaceId, baselineRef, scope, providerId: "sql-text" });
  }
}
```

### `workspaces/SqlWorkspaceFiles.ts`

Checks workspace identity, bounded file contents, gate ownership, and expected revisions in the same write transaction.

```typescript
import type { IWorkspaceFiles } from "./IWorkspaceFiles";
import type { WorkspaceHandle } from "./WorkspaceHandle";
import type { WorkspaceStatements } from "./WorkspaceStatements";
import type { WorkspaceFileSnapshot } from "./WorkspaceFileSnapshot";
import type { WorkspaceReplaceResult } from "./WorkspaceReplaceResult";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase";
import type { ISqlExecutor } from "../persistence/sql/ISqlExecutor";
import { WorkspaceBoundary } from "./WorkspaceBoundary";
import { WorkspaceOperationError } from "../errors/WorkspaceOperationError";
export class SqlWorkspaceFiles implements IWorkspaceFiles {
  private readonly key: readonly string[];
  constructor(private readonly db: ISqlDatabase, private readonly sql: WorkspaceStatements, private readonly handle: WorkspaceHandle,
    private readonly boundary: WorkspaceBoundary) { this.key = Object.freeze([handle.scope.scopeId, handle.scope.projectId, handle.workspaceId]); }
  async read(path: string, maxBytes = this.boundary.maxFileBytes): Promise<WorkspaceFileSnapshot> {
    this.boundary.requireRead(path);
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > this.boundary.maxFileBytes) throw new WorkspaceOperationError();
    await this.checkWorkspace(this.db); return this.load(this.db, path, maxBytes);
  }
  async replace(ownerToken: string, path: string, expectedRevision: number | null, text: string | null): Promise<WorkspaceReplaceResult> {
    this.boundary.requireWrite(path); this.boundary.requireRead(path);
    if (text !== null) this.boundary.validateText(text);
    if (!/^[a-zA-Z0-9_.:-]{1,128}$/.test(ownerToken) || (expectedRevision !== null && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0))) throw new WorkspaceOperationError();
    return this.db.transaction(async tx => {
      await this.checkWorkspace(tx);
      if ((await tx.query(this.sql.assertOwner, [...this.key, ownerToken])).affectedRows !== 1) throw new WorkspaceOperationError();
      const current = await this.load(tx, path);
      if (current.revision !== expectedRevision) return { applied: false, snapshot: current };
      if (current.revision === Number.MAX_SAFE_INTEGER) throw new WorkspaceOperationError();
      const quota = await tx.query(this.sql.quota, this.key); const usage = quota.rows[0];
      if (quota.rows.length !== 1 || typeof usage.file_count !== "number" || !Number.isSafeInteger(usage.file_count) || usage.file_count < 0 ||
          typeof usage.content_bytes !== "number" || !Number.isSafeInteger(usage.content_bytes) || usage.content_bytes < 0 ||
          (current.revision === null && usage.file_count >= 256) || usage.content_bytes - new TextEncoder().encode(current.text ?? "").byteLength + new TextEncoder().encode(text ?? "").byteLength > 1048576) throw new WorkspaceOperationError();
      const revision = current.revision === null ? 0 : current.revision + 1;
      if (current.revision === null) await tx.query(this.sql.insertFile, [...this.key, path, text]);
      else if ((await tx.query(this.sql.updateFile, [revision, text, ...this.key, path, current.revision])).affectedRows !== 1) throw new WorkspaceOperationError();
      return { applied: true, snapshot: Object.freeze({ path, revision, text }) };
    });
  }
  private async checkWorkspace(tx: ISqlExecutor): Promise<void> {
    const result = await tx.query(this.sql.workspace, this.key);
    if (this.handle.schemaVersion !== 1 || this.handle.providerId !== "sql-text" || this.handle.scope.workspaceId !== this.handle.workspaceId || result.rows.length !== 1 || result.rows[0].baseline_ref !== this.handle.baselineRef) throw new WorkspaceOperationError();
  }
  private async load(tx: ISqlExecutor, path: string, maxBytes = this.boundary.maxFileBytes): Promise<WorkspaceFileSnapshot> {
    const result = await tx.query(this.sql.read, [maxBytes, maxBytes, ...this.key, path]);
    if (result.rows.length === 0) return Object.freeze({ path, revision: null, text: null });
    const row = result.rows[0];
    if (row.too_large !== 0 || result.rows.length !== 1 || typeof row.revision !== "number" || !Number.isSafeInteger(row.revision) || row.revision < 0 || (row.content !== null && typeof row.content !== "string")) throw new WorkspaceOperationError();
    if (typeof row.content === "string") this.boundary.validateText(row.content);
    return Object.freeze({ path, revision: row.revision, text: row.content as string | null });
  }
}
```

### `workspaces/SqlWorkspaceEditGate.ts`

Uses one persistent exclusive owner per workspace and never expires a live editing session based only on elapsed time.

```typescript
import type { IWorkspaceEditGate } from "./IWorkspaceEditGate";
import type { WorkspaceHandle } from "./WorkspaceHandle";
import type { WorkspaceStatements } from "./WorkspaceStatements";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase";
import { WorkspaceOperationError } from "../errors/WorkspaceOperationError";
export class SqlWorkspaceEditGate implements IWorkspaceEditGate {
  private readonly key: readonly string[];
  constructor(private readonly db: ISqlDatabase, private readonly sql: WorkspaceStatements, private readonly handle: WorkspaceHandle) { this.key = Object.freeze([handle.scope.scopeId, handle.scope.projectId, handle.workspaceId]); }
  async acquire(ownerToken: string): Promise<boolean> {
    this.token(ownerToken);
    return this.db.transaction(async tx => {
      const existing = await tx.query(this.sql.workspace, this.key);
      if (existing.rows.length !== 1 || existing.rows[0].baseline_ref !== this.handle.baselineRef) throw new WorkspaceOperationError();
      return (await tx.query(this.sql.acquire, [...this.key, ownerToken])).affectedRows === 1;
    });
  }
  async release(ownerToken: string): Promise<void> {
    this.token(ownerToken);
    if ((await this.db.query(this.sql.release, [...this.key, ownerToken])).affectedRows !== 1) throw new WorkspaceOperationError();
  }
  private token(value: string): void { if (!/^[a-zA-Z0-9_.:-]{1,128}$/.test(value)) throw new WorkspaceOperationError(); }
}
```

### `workspaces/WorkspaceEditSession.ts`

Provides a bounded editing scope and tracks writes so a callback cannot release ownership while detached writes are still pending.

```typescript
import type { IWorkspaceFiles } from "./IWorkspaceFiles";
import type { WorkspaceReplaceResult } from "./WorkspaceReplaceResult";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { WorkspaceOperationError } from "../errors/WorkspaceOperationError";
export class WorkspaceEditSession {
  private active = true;
  private actions = 0;
  private readonly writes: Promise<WorkspaceReplaceResult>[] = [];
  constructor(private readonly files: IWorkspaceFiles, private readonly ownerToken: string, private readonly controls: ExecutionBoundaryGuard) {}
  async read(path: string) { this.check(); return this.files.read(path); }
  replace(path: string, expectedRevision: number | null, text: string | null): Promise<WorkspaceReplaceResult> {
    this.check();
    const write = this.files.replace(this.ownerToken, path, expectedRevision, text);
    this.writes.push(write); void write.catch(() => {});
    return write;
  }
  async closeAndDrain(): Promise<void> {
    this.active = false;
    const settled = await Promise.allSettled(this.writes);
    if (settled.some(result => result.status === "rejected")) throw new WorkspaceOperationError();
  }
  private check(): void {
    if (!this.active || this.actions >= 64 || this.controls.check() !== null) throw new WorkspaceOperationError();
    this.actions++;
  }
}
```

### `workspaces/WorkspaceEditingOutcome.ts`

Distinguishes an exclusive editing callback from a busy workspace or a pre-admission control stop.

```typescript
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason";
export type WorkspaceEditingOutcome<TValue> =
  | Readonly<{ kind: "completed"; value: TValue }>
  | Readonly<{ kind: "busy" }>
  | Readonly<{ kind: "stopped"; reason: ExecutionStopReason }>;
```

### `workspaces/SequentialWorkspaceEditor.ts`

Holds the shared editing gate for the callback and all its tracked writes; failures never trigger automatic stale-owner takeover.

```typescript
import type { IWorkspaceFiles } from "./IWorkspaceFiles";
import type { IWorkspaceEditGate } from "./IWorkspaceEditGate";
import type { IClock } from "../contracts/runtime/IClock";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { WorkspaceHandle } from "./WorkspaceHandle";
import type { WorkspaceEditingOutcome } from "./WorkspaceEditingOutcome";
import { WorkspaceEditSession } from "./WorkspaceEditSession";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { WorkspaceOperationError } from "../errors/WorkspaceOperationError";
export class SequentialWorkspaceEditor {
  constructor(private readonly files: IWorkspaceFiles, private readonly gate: IWorkspaceEditGate,
    private readonly handle: WorkspaceHandle, private readonly clock: IClock, private readonly ids: IIdGenerator) {}
  async edit<TValue>(context: IExecutionContext, work: (session: WorkspaceEditSession) => Promise<TValue>): Promise<WorkspaceEditingOutcome<TValue>> {
    if (context.scope.scopeId !== this.handle.scope.scopeId || context.scope.projectId !== this.handle.scope.projectId || context.scope.workspaceId !== this.handle.workspaceId) throw new WorkspaceOperationError();
    const controls = new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs);
    const before = controls.check(); if (before !== null) return { kind: "stopped", reason: before };
    const owner = this.ids.nextId();
    if (!await this.gate.acquire(owner)) return { kind: "busy" };
    const session = new WorkspaceEditSession(this.files, owner, controls);
    try {
      const admitted = controls.check(); if (admitted !== null) return { kind: "stopped", reason: admitted };
      return { kind: "completed", value: await work(session) };
    } finally {
      // Never race the actual callback against a timer here. The caller can stop waiting, but this owner must drain first.
      await session.closeAndDrain();
      await this.gate.release(owner);
    }
  }
}
```

### `workspaces/WorkspaceSourceReader.ts`

Maps authorized opaque source references to permitted workspace paths and implements the page-13 bounded read seam.

```typescript
import type { IScopedSourceReader } from "../tools/source/IScopedSourceReader";
import type { IWorkspaceFiles } from "./IWorkspaceFiles";
import { WorkspaceOperationError } from "../errors/WorkspaceOperationError";
export class WorkspaceSourceReader implements IScopedSourceReader {
  private readonly references: ReadonlyMap<string, string>;
  constructor(private readonly files: IWorkspaceFiles, references: ReadonlyMap<string, string>) {
    if (references.size > 256 || [...references.keys()].some(ref => !/^source:[a-zA-Z0-9_.:/-]{1,128}$/.test(ref))) throw new WorkspaceOperationError();
    this.references = new Map(references);
  }
  async read(sourceRef: string, maxBytes: number, signal: AbortSignal): Promise<string> {
    if (signal.aborted || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 65536) throw new WorkspaceOperationError();
    const path = this.references.get(sourceRef); if (path === undefined) throw new WorkspaceOperationError();
    const file = await this.files.read(path, maxBytes);
    if (signal.aborted || file.text === null) throw new WorkspaceOperationError();
    return file.text;
  }
}
```

### `tests/workspaces/IWorkspaceTestHarness.ts`

Supplies disposable real SQL workspace services and reopens the same database for gate/revision recovery checks.

```typescript
import type { IWorkspaceProvider } from "../../workspaces/IWorkspaceProvider";
import type { IWorkspaceFiles } from "../../workspaces/IWorkspaceFiles";
import type { IWorkspaceEditGate } from "../../workspaces/IWorkspaceEditGate";
import type { WorkspaceHandle } from "../../workspaces/WorkspaceHandle";
import type { WorkspaceBoundary } from "../../workspaces/WorkspaceBoundary";
export interface IWorkspaceTestHarness {
  provider(): Promise<IWorkspaceProvider>;
  files(handle: WorkspaceHandle, boundary: WorkspaceBoundary): IWorkspaceFiles;
  gate(handle: WorkspaceHandle): IWorkspaceEditGate;
  close(): Promise<void>;
}
```

### `tests/workspaces/checkWorkspaceIsolation.ts`

Checks independent copies, exclusive claims, expected-revision conflicts, tombstones, scope boundaries, and restart preservation.

```typescript
import type { IWorkspaceTestHarness } from "./IWorkspaceTestHarness";
import { WorkspaceBoundary } from "../../workspaces/WorkspaceBoundary";
export async function checkWorkspaceIsolation(harness: IWorkspaceTestHarness): Promise<void> {
  const provider = await harness.provider();
  const seed = [{ path: "src/login.ts", text: "baseline" }];
  const one = await provider.create("working-one", "baseline-one", seed);
  const two = await provider.create("working-two", "baseline-one", seed);
  const boundary = new WorkspaceBoundary(["src/login.ts"], ["src/login.ts"], 65536);
  let files = harness.files(one, boundary); let gate = harness.gate(one);
  const claims = await Promise.all([gate.acquire("owner-a"), gate.acquire("owner-b")]);
  if (claims.filter(Boolean).length !== 1) throw new Error("Concurrent editing owners acquired the same workspace.");
  const owner = claims[0] ? "owner-a" : "owner-b";
  const initial = await files.read("src/login.ts");
  if (!await files.replace(owner, "src/login.ts", initial.revision, "first edit").then(value => value.applied)) throw new Error("Valid edit rejected.");
  if ((await files.replace(owner, "src/login.ts", initial.revision, "stale edit")).applied) throw new Error("Stale write replaced newer content.");
  if ((await harness.files(two, boundary).read("src/login.ts")).text !== "baseline" || seed[0].text !== "baseline") throw new Error("Working copy changed source or another workspace.");
  let rejected = false; try { await files.replace("not-owner", "src/login.ts", 1, "wrong owner"); } catch { rejected = true; }
  if (!rejected) throw new Error("Non-owner edited the workspace.");
  const deleted = await files.replace(owner, "src/login.ts", 1, null);
  if (!deleted.applied || (await files.replace(owner, "src/login.ts", null, "stale recreate")).applied) throw new Error("Deletion lost its version.");
  await gate.release(owner);
  await harness.close(); await harness.provider(); files = harness.files(one, boundary); gate = harness.gate(one);
  const restored = await files.read("src/login.ts");
  if (restored.text !== null || restored.revision !== 2) throw new Error("Restart lost workspace history.");
  if (!await gate.acquire("restart-owner")) throw new Error("Released gate did not reopen.");
  await gate.release("restart-owner");
  let escaped = false; try { boundary.requireWrite("../login.ts"); } catch { escaped = true; }
  if (!escaped) throw new Error("Traversal accepted.");
  await harness.close();
}
```

### `examples/workspaces/LoginSequentialEditingExample.ts`

Shows two workers editing login.ts sequentially and the second re-reading the latest file revision before its change.

```typescript
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import { SequentialWorkspaceEditor } from "../../workspaces/SequentialWorkspaceEditor";
export class LoginSequentialEditingExample {
  constructor(private readonly editor: SequentialWorkspaceEditor) {}
  async run(firstContext: IExecutionContext, secondContext: IExecutionContext) {
    const first = await this.editor.edit(firstContext, async session => {
      const file = await session.read("src/login.ts");
      return session.replace("src/login.ts", file.revision, "export const login = 'google';");
    });
    if (first.kind !== "completed" || !first.value.applied) return { first, second: null };
    const second = await this.editor.edit(secondContext, async session => {
      const current = await session.read("src/login.ts");
      return session.replace("src/login.ts", current.revision, `${current.text ?? ""}\nexport const callbackVerified = false;`);
    });
    return { first, second };
  }
}
```

### `index.ts`

Appends the supported workspace API while preserving earlier exports; examples and test harnesses remain private.

```typescript
export type { WorkspaceHandle } from "./workspaces/WorkspaceHandle";
export type { WorkspaceSeedFile } from "./workspaces/WorkspaceSeedFile";
export type { WorkspaceFileSnapshot } from "./workspaces/WorkspaceFileSnapshot";
export type { WorkspaceReplaceResult } from "./workspaces/WorkspaceReplaceResult";
export { WorkspaceOperationError } from "./errors/WorkspaceOperationError";
export { WorkspaceBoundary } from "./workspaces/WorkspaceBoundary";
export type { IWorkspaceProvider } from "./workspaces/IWorkspaceProvider";
export type { IWorkspaceFiles } from "./workspaces/IWorkspaceFiles";
export type { IWorkspaceEditGate } from "./workspaces/IWorkspaceEditGate";
export type { WorkspaceStatements } from "./workspaces/WorkspaceStatements";
export { sqliteWorkspaceStatements } from "./workspaces/sqliteWorkspaceStatements";
export { postgresqlWorkspaceStatements } from "./workspaces/postgresqlWorkspaceStatements";
export { SqlTextWorkspaceProvider } from "./workspaces/SqlTextWorkspaceProvider";
export { SqlWorkspaceFiles } from "./workspaces/SqlWorkspaceFiles";
export { SqlWorkspaceEditGate } from "./workspaces/SqlWorkspaceEditGate";
export { WorkspaceEditSession } from "./workspaces/WorkspaceEditSession";
export type { WorkspaceEditingOutcome } from "./workspaces/WorkspaceEditingOutcome";
export { SequentialWorkspaceEditor } from "./workspaces/SequentialWorkspaceEditor";
export { WorkspaceSourceReader } from "./workspaces/WorkspaceSourceReader";
```
