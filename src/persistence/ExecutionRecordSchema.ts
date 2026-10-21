import type { ISqlDatabase } from "./sql/ISqlDatabase.js";
import type { ExecutionRecordStatements } from "./sql/ExecutionRecordStatements.js";
import { PersistenceError } from "../errors/PersistenceError.js";

export class ExecutionRecordSchema {
  constructor(
    private readonly database: ISqlDatabase,
    private readonly statements: ExecutionRecordStatements,
  ) {}

  async initialize(): Promise<void> {
    try {
      await this.database.migrationTransaction(async transaction => {
        const [ledgerTable, ...recordTables] = this.statements.schema;
        if (ledgerTable === undefined || recordTables.length < 2) {
          throw new PersistenceError("Execution-record schema definition is incomplete.");
        }
        await transaction.query(ledgerTable, []);
        const result = await transaction.query(this.statements.readSchemaVersion, []);
        if (result.rows.length > 1) throw new PersistenceError("Ambiguous framework schema version.");
        if (result.rows.length === 1) {
          if (result.rows[0].version !== 1) throw new PersistenceError("Unsupported framework schema version.");
          return;
        }
        for (const ddl of recordTables) await transaction.query(ddl, []);
        const installed = await transaction.query(this.statements.installSchemaVersion, []);
        if (installed.affectedRows !== 1) throw new PersistenceError("Framework schema version was not installed.");
      });
    } catch (error: unknown) {
      if (error instanceof PersistenceError) throw error;
      throw new PersistenceError("Framework schema initialization failed.");
    }
  }
}
