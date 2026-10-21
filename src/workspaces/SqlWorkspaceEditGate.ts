import type { IWorkspaceEditGate } from "./IWorkspaceEditGate.js";
import type { WorkspaceHandle } from "./WorkspaceHandle.js";
import type { WorkspaceStatements } from "./WorkspaceStatements.js";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase.js";
import { WorkspaceOperationError } from "../errors/WorkspaceOperationError.js";
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
