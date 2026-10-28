import type { FilesystemReceiptStatements } from "./FilesystemReceiptStatements.js";
import { sqliteFilesystemReceiptStatements } from "./sqliteFilesystemReceiptStatements.js";

export const postgresqlFilesystemReceiptStatements: FilesystemReceiptStatements = Object.freeze({
  schema: sqliteFilesystemReceiptStatements.schema,
  insert: "INSERT INTO kushibot_filesystem_receipts_v1 (scope_id, project_id, workspace_key, target_id, operation_id, payload) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (scope_id, project_id, workspace_key, target_id, operation_id) DO NOTHING",
  read: "SELECT payload FROM kushibot_filesystem_receipts_v1 WHERE scope_id = $1 AND project_id = $2 AND workspace_key = $3 AND target_id = $4 AND operation_id = $5",
});
