import type { UsageLedgerStatements } from "./UsageLedgerStatements.js";
export const postgresqlUsageLedgerStatements: UsageLedgerStatements = Object.freeze({
  "schema": "CREATE TABLE IF NOT EXISTS kushibot_usage_ledgers_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, ledger_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, ledger_id))",
  "insert": "INSERT INTO kushibot_usage_ledgers_v1 (scope_id, project_id, ledger_id, payload) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
  "lock": "UPDATE kushibot_usage_ledgers_v1 SET payload = payload WHERE scope_id = $1 AND project_id = $2 AND ledger_id = $3",
  "read": "SELECT payload FROM kushibot_usage_ledgers_v1 WHERE scope_id = $1 AND project_id = $2 AND ledger_id = $3",
  "update": "UPDATE kushibot_usage_ledgers_v1 SET payload = $1 WHERE scope_id = $2 AND project_id = $3 AND ledger_id = $4"
});
