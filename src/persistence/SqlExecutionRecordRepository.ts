import type { IExecutionRecordRepository } from "../contracts/persistence/IExecutionRecordRepository.js";
import type { IRecordCodec } from "../contracts/persistence/IRecordCodec.js";
import type { ExecutionRecord } from "../contracts/persistence/ExecutionRecord.js";
import type { StoredExecutionRecord } from "../contracts/persistence/StoredExecutionRecord.js";
import type { SaveExecutionRecord } from "../contracts/persistence/SaveExecutionRecord.js";
import type { SaveRecordReceipt } from "../contracts/persistence/SaveRecordReceipt.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { ISqlDatabase } from "./sql/ISqlDatabase.js";
import type { ISqlExecutor } from "./sql/ISqlExecutor.js";
import type { ExecutionRecordStatements } from "./sql/ExecutionRecordStatements.js";
import { PersistenceError } from "../errors/PersistenceError.js";
import { PersistenceConflictError } from "../errors/PersistenceConflictError.js";
import { CommandIdentityConflictError } from "../errors/CommandIdentityConflictError.js";
import { InvalidPersistenceRecordError } from "../errors/InvalidPersistenceRecordError.js";

export class SqlExecutionRecordRepository implements IExecutionRecordRepository {
  private readonly scope: ExecutionScopeRef;

  constructor(
    private readonly database: ISqlDatabase,
    private readonly statements: ExecutionRecordStatements,
    private readonly codec: IRecordCodec<ExecutionRecord>,
    scope: ExecutionScopeRef,
  ) {
    if (typeof scope !== "object" || scope === null || !scope.scopeId?.trim() || !scope.projectId?.trim() ||
        (scope.workspaceId !== undefined && !scope.workspaceId.trim()) ||
        Object.keys(scope).some(key => !["scopeId", "projectId", "workspaceId"].includes(key))) {
      throw new InvalidPersistenceRecordError("Invalid repository scope.");
    }
    this.scope = Object.freeze({
      scopeId: scope.scopeId,
      projectId: scope.projectId,
      ...(scope.workspaceId === undefined ? {} : { workspaceId: scope.workspaceId }),
    });
  }

  async load(executionId: string): Promise<StoredExecutionRecord | null> {
    this.requireId(executionId);
    return this.storageBoundary(() => this.read(this.database, executionId));
  }

  async save(command: SaveExecutionRecord): Promise<SaveRecordReceipt> {
    if (typeof command !== "object" || command === null) {
      throw new InvalidPersistenceRecordError("Expected a save command.");
    }
    const commandId = command.commandId;
    const expected = command.expectedVersion;
    this.requireId(commandId);
    if (!Number.isSafeInteger(expected) || expected < 0 || !Number.isSafeInteger(expected + 1)) {
      throw new InvalidPersistenceRecordError("Invalid expected record version.");
    }
    const payload = await this.codec.encode(command.record);
    const record = await this.codec.decode(payload);
    this.checkScope(record);
    const version = expected + 1;
    const executionId = record.lifecycle.executionId;
    const key = [this.scope.scopeId, this.scope.projectId, executionId];

    return this.storageBoundary(() => this.database.transaction(async transaction => {
      const receiptResult = await transaction.query(this.statements.selectReceipt, [...key, commandId]);
      if (receiptResult.rows.length > 1) {
        throw new InvalidPersistenceRecordError("Duplicate save receipts were found.");
      }
      if (receiptResult.rows.length === 1) {
        const row = receiptResult.rows[0];
        if (typeof row.payload !== "string" || typeof row.expected_version !== "number" ||
            !Number.isSafeInteger(row.expected_version) || row.expected_version < 0) {
          throw new InvalidPersistenceRecordError("Invalid stored save receipt.");
        }
        if (row.expected_version !== expected || row.payload !== payload) {
          throw new CommandIdentityConflictError("Save-command identity was reused for different data.");
        }
        if (this.version(row.record_version) !== version) {
          throw new InvalidPersistenceRecordError("Stored save receipt version is inconsistent.");
        }
        return {
          stored: { recordVersion: version, record },
          replayed: true,
        };
      }

      const existing = await this.read(transaction, executionId);
      if ((existing?.recordVersion ?? 0) !== expected) {
        throw new PersistenceConflictError("Record version changed.");
      }
      if (existing !== null) this.checkHistory(existing.record, record);
      const result = existing === null
        ? await transaction.query(this.statements.insertRecord, [...key, version, payload])
        : await transaction.query(this.statements.updateRecord, [version, payload, ...key, expected]);
      if (result.affectedRows !== 1) throw new PersistenceConflictError("Compare-and-set write rejected.");
      const receipt = await transaction.query(
        this.statements.insertReceipt,
        [...key, commandId, expected, version, payload],
      );
      if (receipt.affectedRows !== 1) throw new PersistenceConflictError("Save receipt write was rejected.");
      return { stored: { recordVersion: version, record }, replayed: false };
    }));
  }

  private async read(executor: ISqlExecutor, executionId: string): Promise<StoredExecutionRecord | null> {
    const result = await executor.query(this.statements.selectRecord, [
      this.scope.scopeId,
      this.scope.projectId,
      executionId,
    ]);
    if (result.rows.length === 0) return null;
    if (result.rows.length !== 1 || typeof result.rows[0].payload !== "string") {
      throw new InvalidPersistenceRecordError("Invalid stored execution row.");
    }
    const row = result.rows[0];
    const record = await this.codec.decode(row.payload as string);
    this.checkScope(record);
    if (record.lifecycle.executionId !== executionId) {
      throw new InvalidPersistenceRecordError("Stored key mismatch.");
    }
    return Object.freeze({ recordVersion: this.version(row.record_version), record });
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
    if (typeof value !== "string" || !value.trim()) {
      throw new InvalidPersistenceRecordError("Expected a nonempty identifier.");
    }
  }

  private version(value: unknown): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
      throw new InvalidPersistenceRecordError("Invalid stored record version.");
    }
    return value;
  }

  private async storageBoundary<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      if (error instanceof PersistenceError || error instanceof InvalidPersistenceRecordError ||
          error instanceof PersistenceConflictError || error instanceof CommandIdentityConflictError) {
        throw error;
      }
      throw new PersistenceError("Execution record storage failed.");
    }
  }
}
