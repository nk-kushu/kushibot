import type { ToolOperationStatements } from "./ToolOperationStatements.js";
export const sqliteToolOperationStatements: ToolOperationStatements = Object.freeze({
  "schema": "CREATE TABLE IF NOT EXISTS kushibot_tool_operations_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, operation_id TEXT NOT NULL, request_key TEXT NOT NULL, owner_token TEXT NOT NULL, status TEXT NOT NULL, payload TEXT, PRIMARY KEY (scope_id, project_id, operation_id))",
  "insert": "INSERT INTO kushibot_tool_operations_v1 (scope_id, project_id, operation_id, request_key, owner_token, status, payload) VALUES (?, ?, ?, ?, ?, 'pending', NULL) ON CONFLICT DO NOTHING",
  "read": "SELECT request_key, owner_token, status, payload FROM kushibot_tool_operations_v1 WHERE scope_id = ? AND project_id = ? AND operation_id = ?",
  "finish": "UPDATE kushibot_tool_operations_v1 SET status = 'completed', payload = ? WHERE scope_id = ? AND project_id = ? AND operation_id = ? AND request_key = ? AND owner_token = ? AND status = 'pending'" ,
  "release": "DELETE FROM kushibot_tool_operations_v1 WHERE scope_id = ? AND project_id = ? AND operation_id = ? AND request_key = ? AND owner_token = ? AND status = 'pending'"
});
