import type { IToolOperationJournal } from "./IToolOperationJournal.js";
import type { ToolOperationStatements } from "./ToolOperationStatements.js";
import type { ToolOperationClaim } from "./ToolOperationClaim.js";
import type { ToolOperationClaimResult } from "./ToolOperationClaimResult.js";
import type { ToolObservation } from "../ToolObservation.js";
import type { ISqlDatabase } from "../../persistence/sql/ISqlDatabase.js";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import { ToolOperationError } from "../../errors/ToolOperationError.js";
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
