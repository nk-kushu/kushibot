import type { FilesystemReceiptStatements } from "./FilesystemReceiptStatements.js";

export const sqliteFilesystemReceiptStatements: FilesystemReceiptStatements = Object.freeze({
  schema: "CREATE TABLE IF NOT EXISTS kushibot_filesystem_receipts_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_key TEXT NOT NULL, target_id TEXT NOT NULL, operation_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, workspace_key, target_id, operation_id))",
  insert: "INSERT INTO kushibot_filesystem_receipts_v1 (scope_id, project_id, workspace_key, target_id, operation_id, payload) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (scope_id, project_id, workspace_key, target_id, operation_id) DO NOTHING",
  read: "SELECT payload FROM kushibot_filesystem_receipts_v1 WHERE scope_id = ? AND project_id = ? AND workspace_key = ? AND target_id = ? AND operation_id = ?",
});
