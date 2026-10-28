import { DatabaseSync } from "node:sqlite";
import type { ISqlDatabase } from "../sql/ISqlDatabase.js";
import type { ISqlExecutor } from "../sql/ISqlExecutor.js";
import type { SqlResult } from "../sql/SqlResult.js";
import type { SqlValue } from "../sql/SqlValue.js";

/** Serializes access to the connection, including complete transactions. */
export class NodeSqliteDatabase implements ISqlDatabase {
  private readonly database: DatabaseSync;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(filename: string) {
    this.database = new DatabaseSync(filename);
    this.database.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=15000;");
  }

  query(sql: string, parameters: readonly SqlValue[]): Promise<SqlResult> {
    return this.enqueue(async () => this.execute(sql, parameters));
  }

  transaction<T>(work: (transaction: ISqlExecutor) => Promise<T>): Promise<T> {
    return this.enqueue(async () => {
      this.database.exec("BEGIN IMMEDIATE");
      try {
        const value = await work({
          query: async (sql, parameters) => this.execute(sql, parameters),
        });
        this.database.exec("COMMIT");
        return value;
      } catch (error) {
        this.database.exec("ROLLBACK");
        throw error;
      }
    });
  }

  migrationTransaction<T>(work: (transaction: ISqlExecutor) => Promise<T>): Promise<T> {
    return this.transaction(work);
  }

  async close(): Promise<void> {
    await this.tail;
    this.database.close();
  }

  private execute(sql: string, parameters: readonly SqlValue[]): SqlResult {
    const statement = this.database.prepare(sql);
    if (statement.columns().length > 0) {
      const before = this.totalChanges();
      const rows = statement.all(...parameters);
      const affectedRows = this.totalChanges() === before
        ? 0
        : Number(this.database.prepare("SELECT changes() AS count").get()!.count);
      return { rows, affectedRows };
    }
    return { rows: [], affectedRows: Number(statement.run(...parameters).changes) };
  }

  private totalChanges(): bigint {
    const statement = this.database.prepare("SELECT total_changes() AS count");
    statement.setReadBigInts(true);
    return statement.get()!.count as bigint;
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(work);
    this.tail = result.catch(() => {});
    return result;
  }
}
