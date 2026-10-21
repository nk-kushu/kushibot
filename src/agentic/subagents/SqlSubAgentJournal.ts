import type { ISubAgentJournal } from "./ISubAgentJournal.js";
import type { SubAgentClaim } from "./SubAgentClaim.js";
import type { SubAgentClaimOutcome } from "./SubAgentClaimOutcome.js";
import type { SubAgentRunSnapshot } from "./SubAgentRunSnapshot.js";
import type { SubAgentJournalStatements } from "./SubAgentJournalStatements.js";
import type { ISqlDatabase } from "../../persistence/sql/ISqlDatabase.js";
import type { ISqlExecutor } from "../../persistence/sql/ISqlExecutor.js";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome.js";
import { SubAgentState } from "./SubAgentState.js";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError.js";
export class SqlSubAgentJournal implements ISubAgentJournal {
  private readonly key: readonly string[];
  private binding: string | null = null;
  constructor(private readonly database: ISqlDatabase,
    private readonly sql: SubAgentJournalStatements,
    private readonly codec: IRecordCodec<SubAgentRunSnapshot>, scopeId: string, projectId: string, runId: string) {
    if (![scopeId,projectId,runId].every(value => /^[A-Za-z0-9_.:-]{1,128}$/.test(value))) throw new SubAgentCoordinationError();
    this.key = Object.freeze([scopeId,projectId,runId]);
  }
  async initialize(initial: SubAgentRunSnapshot): Promise<void> {
    if (initial.records.length !== 0) throw new SubAgentCoordinationError();
    const payload = await this.codec.encode(initial);
    const expected = this.bind(initial);
    await this.database.migrationTransaction(async tx => {
      await tx.query(this.sql.schema,[]); await tx.query(this.sql.insert,[...this.key,payload]);
      const saved = await this.load(tx); if (this.bind(saved) !== expected) throw new SubAgentCoordinationError();
    });
    this.binding = expected;
  }
  async read(): Promise<SubAgentRunSnapshot> { if (this.binding === null) throw new SubAgentCoordinationError(); const snapshot = await this.load(this.database); if (this.bind(snapshot) !== this.binding) throw new SubAgentCoordinationError(); return snapshot; }
  claim(input: SubAgentClaim): Promise<SubAgentClaimOutcome> { return this.change(state => state.claim(input)); }
  complete(childId: string, outcome: ExecutionOutcome<JsonValue>): Promise<void> { return this.change(state => state.complete(childId,outcome)); }
  private change<T>(work: (state: SubAgentState) => T): Promise<T> {
    if (this.binding === null) throw new SubAgentCoordinationError();
    return this.database.transaction(async tx => {
      if ((await tx.query(this.sql.lock,this.key)).affectedRows !== 1) throw new SubAgentCoordinationError();
      const snapshot = await this.load(tx); if (this.bind(snapshot) !== this.binding) throw new SubAgentCoordinationError();
      const state = new SubAgentState(snapshot); const result = work(state);
      const payload = await this.codec.encode(state.snapshot());
      if ((await tx.query(this.sql.update,[payload,...this.key])).affectedRows !== 1) throw new SubAgentCoordinationError();
      return result;
    });
  }
  private async load(tx: ISqlExecutor): Promise<SubAgentRunSnapshot> {
    const rows = (await tx.query(this.sql.read,this.key)).rows;
    if (rows.length !== 1 || typeof rows[0].payload !== "string") throw new SubAgentCoordinationError();
    const snapshot = await this.codec.decode(rows[0].payload);
    if (snapshot.scope.scopeId !== this.key[0] || snapshot.scope.projectId !== this.key[1] || snapshot.runId !== this.key[2]) throw new SubAgentCoordinationError();
    return snapshot;
  }
  private bind(snapshot: SubAgentRunSnapshot): string { return JSON.stringify([snapshot.schemaVersion,snapshot.runId,snapshot.rootSessionId,snapshot.rootBudgetScopeId,snapshot.scope.scopeId,snapshot.scope.projectId,snapshot.scope.workspaceId ?? null,snapshot.maxChildren,snapshot.maxDepth]); }
}
