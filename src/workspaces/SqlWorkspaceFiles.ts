import type { IWorkspaceFiles } from "./IWorkspaceFiles.js";
import type { WorkspaceHandle } from "./WorkspaceHandle.js";
import type { WorkspaceStatements } from "./WorkspaceStatements.js";
import type { WorkspaceFileSnapshot } from "./WorkspaceFileSnapshot.js";
import type { WorkspaceReplaceResult } from "./WorkspaceReplaceResult.js";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase.js";
import type { ISqlExecutor } from "../persistence/sql/ISqlExecutor.js";
import { WorkspaceBoundary } from "./WorkspaceBoundary.js";
import { WorkspaceOperationError } from "../errors/WorkspaceOperationError.js";
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
