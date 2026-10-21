import type { ISqlExecutor } from "./ISqlExecutor.js";

/**
 * Driver bindings must pin one connection, commit only successful callbacks, and fully roll back
 * callback failures. Migrations require a backend-wide transactional lock with bounded waits.
 * SQLite bindings should serialize migrations with an immediate write transaction; PostgreSQL
 * bindings should hold a transaction-level advisory lock for this schema namespace.
 * Returned version and affected-row values must be safe JavaScript numbers.
 */
export interface ISqlDatabase extends ISqlExecutor {
  transaction<T>(work: (transaction: ISqlExecutor) => Promise<T>): Promise<T>;
  migrationTransaction<T>(work: (transaction: ISqlExecutor) => Promise<T>): Promise<T>;
}
