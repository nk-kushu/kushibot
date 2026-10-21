import type { ToolOperationStatements } from "./ToolOperationStatements.js";
export const postgresqlToolOperationStatements: ToolOperationStatements = Object.freeze({
  "schema": "CREATE TABLE IF NOT EXISTS kushibot_tool_operations_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, operation_id TEXT NOT NULL, request_key TEXT NOT NULL, owner_token TEXT NOT NULL, status TEXT NOT NULL, payload TEXT, PRIMARY KEY (scope_id, project_id, operation_id))",
  "insert": "INSERT INTO kushibot_tool_operations_v1 (scope_id, project_id, operation_id, request_key, owner_token, status, payload) VALUES ($1, $2, $3, $4, $5, 'pending', NULL) ON CONFLICT DO NOTHING",
  "read": "SELECT request_key, owner_token, status, payload FROM kushibot_tool_operations_v1 WHERE scope_id = $1 AND project_id = $2 AND operation_id = $3",
  "finish": "UPDATE kushibot_tool_operations_v1 SET status = 'completed', payload = $1 WHERE scope_id = $2 AND project_id = $3 AND operation_id = $4 AND request_key = $5 AND owner_token = $6 AND status = 'pending'" ,
  "release": "DELETE FROM kushibot_tool_operations_v1 WHERE scope_id = $1 AND project_id = $2 AND operation_id = $3 AND request_key = $4 AND owner_token = $5 AND status = 'pending'"
});
