import type { IWorkspaceProvider } from "./IWorkspaceProvider.js";
import type { WorkspaceHandle } from "./WorkspaceHandle.js";
import type { WorkspaceSeedFile } from "./WorkspaceSeedFile.js";
import type { WorkspaceStatements } from "./WorkspaceStatements.js";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import { WorkspaceBoundary } from "./WorkspaceBoundary.js";
import { WorkspaceOperationError } from "../errors/WorkspaceOperationError.js";
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
