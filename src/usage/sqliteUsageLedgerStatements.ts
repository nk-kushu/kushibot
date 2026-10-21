import type { UsageLedgerStatements } from "./UsageLedgerStatements.js";
export const sqliteUsageLedgerStatements: UsageLedgerStatements = Object.freeze({
  "schema": "CREATE TABLE IF NOT EXISTS kushibot_usage_ledgers_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, ledger_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, ledger_id))",
  "insert": "INSERT INTO kushibot_usage_ledgers_v1 (scope_id, project_id, ledger_id, payload) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
  "lock": "UPDATE kushibot_usage_ledgers_v1 SET payload = payload WHERE scope_id = ? AND project_id = ? AND ledger_id = ?",
  "read": "SELECT payload FROM kushibot_usage_ledgers_v1 WHERE scope_id = ? AND project_id = ? AND ledger_id = ?",
  "update": "UPDATE kushibot_usage_ledgers_v1 SET payload = ? WHERE scope_id = ? AND project_id = ? AND ledger_id = ?"
});
