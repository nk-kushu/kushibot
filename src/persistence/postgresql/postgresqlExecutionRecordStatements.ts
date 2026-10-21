import type { ExecutionRecordStatements } from "../sql/ExecutionRecordStatements.js";

export const postgresqlExecutionRecordStatements: ExecutionRecordStatements = Object.freeze({
  schema: Object.freeze([
    "CREATE TABLE IF NOT EXISTS kushibot_schema_versions (\n  name TEXT PRIMARY KEY, version INTEGER NOT NULL CHECK (version > 0)\n)",
    "CREATE TABLE IF NOT EXISTS kushibot_execution_records (\n  scope_id TEXT NOT NULL, project_id TEXT NOT NULL, execution_id TEXT NOT NULL,\n  record_version BIGINT NOT NULL CHECK (record_version > 0),\n  payload TEXT NOT NULL,\n  PRIMARY KEY (scope_id, project_id, execution_id)\n)",
    "CREATE TABLE IF NOT EXISTS kushibot_save_receipts (\n  scope_id TEXT NOT NULL, project_id TEXT NOT NULL, execution_id TEXT NOT NULL,\n  command_id TEXT NOT NULL, expected_version BIGINT NOT NULL CHECK (expected_version >= 0),\n  record_version BIGINT NOT NULL CHECK (record_version > 0), payload TEXT NOT NULL,\n  PRIMARY KEY (scope_id, project_id, execution_id, command_id)\n)",
  ]),
  readSchemaVersion: "SELECT version FROM kushibot_schema_versions WHERE name = 'execution-records'",
  installSchemaVersion: "INSERT INTO kushibot_schema_versions (name, version) VALUES ('execution-records', 1)",
  selectRecord: "SELECT record_version, payload FROM kushibot_execution_records WHERE scope_id = $1 AND project_id = $2 AND execution_id = $3",
  insertRecord: "INSERT INTO kushibot_execution_records (scope_id, project_id, execution_id, record_version, payload) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (scope_id, project_id, execution_id) DO NOTHING",
  updateRecord: "UPDATE kushibot_execution_records SET record_version = $1, payload = $2 WHERE scope_id = $3 AND project_id = $4 AND execution_id = $5 AND record_version = $6",
  selectReceipt: "SELECT expected_version, record_version, payload FROM kushibot_save_receipts WHERE scope_id = $1 AND project_id = $2 AND execution_id = $3 AND command_id = $4",
  insertReceipt: "INSERT INTO kushibot_save_receipts (scope_id, project_id, execution_id, command_id, expected_version, record_version, payload) VALUES ($1, $2, $3, $4, $5, $6, $7)",
});
