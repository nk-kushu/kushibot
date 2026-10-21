import type { SqlValue } from "./SqlValue.js";
import type { SqlResult } from "./SqlResult.js";

export interface ISqlExecutor {
  query(sql: string, parameters: readonly SqlValue[]): Promise<SqlResult>;
}
