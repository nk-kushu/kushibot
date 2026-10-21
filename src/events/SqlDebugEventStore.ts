import type { IDebugEventStore } from "./IDebugEventStore.js";
import type { ITransactionalDebugEventWriter } from "./ITransactionalDebugEventWriter.js";
import type { DebugEventStatements } from "./DebugEventStatements.js";
import type { DebugEvent } from "./DebugEvent.js";
import type { RecordedDebugEvent } from "./RecordedDebugEvent.js";
import type { AppendDebugEventResult } from "./AppendDebugEventResult.js";
import type { DebugEventPage } from "./DebugEventPage.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IRecordCodec } from "../contracts/persistence/IRecordCodec.js";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase.js";
import type { ISqlExecutor } from "../persistence/sql/ISqlExecutor.js";
import { DebugEventConflictError } from "../errors/DebugEventConflictError.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";

export class SqlDebugEventStore implements IDebugEventStore, ITransactionalDebugEventWriter {
  private readonly scope: ExecutionScopeRef;
  constructor(private readonly database: ISqlDatabase, private readonly sql: DebugEventStatements,
    scope: ExecutionScopeRef, private readonly codec: IRecordCodec<DebugEvent>, private readonly clock: IClock,
    private readonly maxPageSize: number) {
    this.scope = Object.freeze({ ...scope });
    if (!Number.isSafeInteger(maxPageSize) || maxPageSize < 1 || maxPageSize > 1000) throw new ConfigurationError("Invalid timeline page bound.");
  }
  async initialize(): Promise<void> {
    // Fixed additive v1 tables. Incompatible schema changes require a numbered migration, never IF NOT EXISTS alone.
    await this.database.migrationTransaction(async tx => { for (const statement of this.sql.schema) await tx.query(statement, []); });
  }
  append(event: DebugEvent): Promise<AppendDebugEventResult> {
    if (event.channel !== "diagnostic") return Promise.reject(new ConfigurationError("Lifecycle events require a state transaction."));
    return this.database.transaction(tx => this.appendWithin(tx, event));
  }
  async appendWithin(tx: ISqlExecutor, input: DebugEvent): Promise<AppendDebugEventResult> {
    const payload = await this.codec.encode(input);
    const event = await this.codec.decode(payload);
    this.checkScope(event);
    const stream = this.stream(event);
    const key = [this.scope.scopeId, this.scope.projectId, stream];
    await tx.query(this.sql.ensureStream, key);
    await tx.query(this.sql.lockStream, key);
    const existing = await tx.query(this.sql.find, [this.scope.scopeId, this.scope.projectId, event.eventId]);
    if (existing.rows.length > 0) {
      if (existing.rows[0].payload !== payload) throw new DebugEventConflictError();
      return { recorded: await this.restore(existing.rows[0], stream), replayed: true };
    }
    const counter = await tx.query(this.sql.counter, key);
    const previous = counter.rows[0]?.next_sequence;
    if (typeof previous !== "number" || !Number.isSafeInteger(previous) || previous < 0 || previous >= Number.MAX_SAFE_INTEGER) throw new ConfigurationError("Invalid stored debug sequence.");
    const sequence = previous + 1;
    const recordedAtEpochMs = this.clock.nowEpochMs();
    if (!Number.isSafeInteger(recordedAtEpochMs) || recordedAtEpochMs < 0 || recordedAtEpochMs > 8640000000000000) throw new ConfigurationError("Invalid recording timestamp.");
    await tx.query(this.sql.advance, [sequence, ...key]);
    await tx.query(this.sql.insert, [this.scope.scopeId, this.scope.projectId, event.eventId, stream, sequence, recordedAtEpochMs, payload]);
    return { recorded: Object.freeze({ event, sequence, recordedAtEpochMs }), replayed: false };
  }
  async read(streamId: string, afterSequence: number, limit: number): Promise<DebugEventPage> {
    if (!/^(run|trace):[^\u0000-\u001f]{1,256}$/.test(streamId) || !Number.isSafeInteger(afterSequence) || afterSequence < 0 ||
        !Number.isSafeInteger(limit) || limit < 1 || limit > this.maxPageSize) throw new ConfigurationError("Invalid timeline request.");
    const result = await this.database.query(this.sql.page, [this.scope.scopeId, this.scope.projectId, streamId, afterSequence, limit + 1]);
    const items: RecordedDebugEvent[] = [];
    for (const row of result.rows.slice(0, limit)) {
      const item = await this.restore(row, streamId);
      if (item.sequence <= (items.length ? items[items.length - 1].sequence : afterSequence)) throw new ConfigurationError("Invalid timeline ordering.");
      items.push(item);
    }
    return { items: Object.freeze(items), nextSequence: result.rows.length > limit ? items[items.length - 1].sequence : null };
  }
  private async restore(row: Readonly<Record<string, unknown>>, stream: string): Promise<RecordedDebugEvent> {
    if (typeof row.payload !== "string" || row.stream_id !== stream || typeof row.sequence !== "number" ||
        !Number.isSafeInteger(row.sequence) || row.sequence < 1 || typeof row.recorded_at_epoch_ms !== "number" ||
        !Number.isSafeInteger(row.recorded_at_epoch_ms) || row.recorded_at_epoch_ms < 0 || row.recorded_at_epoch_ms > 8640000000000000) throw new ConfigurationError("Invalid stored debug event.");
    const event = await this.codec.decode(row.payload);
    this.checkScope(event);
    if (this.stream(event) !== stream) throw new ConfigurationError("Stored stream does not match event.");
    return Object.freeze({ event, sequence: row.sequence, recordedAtEpochMs: row.recorded_at_epoch_ms });
  }
  private stream(event: DebugEvent): string { return event.identity.runId === undefined ? `trace:${event.trace.traceId}` : `run:${event.identity.runId}`; }
  private checkScope(event: DebugEvent): void {
    if (event.scope.scopeId !== this.scope.scopeId || event.scope.projectId !== this.scope.projectId || event.scope.workspaceId !== this.scope.workspaceId) throw new ConfigurationError("Debug scope mismatch.");
  }
}
