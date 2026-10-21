import type { IUsageLedgerStore } from "./IUsageLedgerStore.js";
import type { UsageLedgerSnapshot } from "./UsageLedgerSnapshot.js";
import type { UsageLedgerStatements } from "./UsageLedgerStatements.js";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase.js";
import type { ISqlExecutor } from "../persistence/sql/ISqlExecutor.js";
import type { IRecordCodec } from "../contracts/persistence/IRecordCodec.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import { UsageLedger } from "./UsageLedger.js";
import { BudgetAccountingError } from "../errors/BudgetAccountingError.js";
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
