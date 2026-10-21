import type { WorkspaceStatements } from "./WorkspaceStatements.js";
export const sqliteWorkspaceStatements: WorkspaceStatements = Object.freeze({
  "schema": [
    "CREATE TABLE IF NOT EXISTS kushibot_workspaces_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_id TEXT NOT NULL, baseline_ref TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, workspace_id))",
    "CREATE TABLE IF NOT EXISTS kushibot_workspace_files_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_id TEXT NOT NULL, path TEXT NOT NULL, revision BIGINT NOT NULL, content TEXT, baseline_content TEXT, PRIMARY KEY (scope_id, project_id, workspace_id, path))",
    "CREATE TABLE IF NOT EXISTS kushibot_workspace_edit_gates_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_id TEXT NOT NULL, owner_token TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, workspace_id))"
  ],
  "createWorkspace": "INSERT INTO kushibot_workspaces_v1 (scope_id, project_id, workspace_id, baseline_ref) VALUES (?, ?, ?, ?)",
  "workspace": "SELECT baseline_ref FROM kushibot_workspaces_v1 WHERE scope_id = ? AND project_id = ? AND workspace_id = ?",
  "seed": "INSERT INTO kushibot_workspace_files_v1 (scope_id, project_id, workspace_id, path, revision, content, baseline_content) VALUES (?, ?, ?, ?, 0, ?, ?)",
  "read": "SELECT revision, CASE WHEN length(CAST(content AS BLOB)) <= ? THEN content ELSE NULL END AS content, CASE WHEN length(CAST(content AS BLOB)) > ? THEN 1 ELSE 0 END AS too_large FROM kushibot_workspace_files_v1 WHERE scope_id = ? AND project_id = ? AND workspace_id = ? AND path = ?",
  "acquire": "INSERT INTO kushibot_workspace_edit_gates_v1 (scope_id, project_id, workspace_id, owner_token) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
  "release": "DELETE FROM kushibot_workspace_edit_gates_v1 WHERE scope_id = ? AND project_id = ? AND workspace_id = ? AND owner_token = ?",
  "assertOwner": "UPDATE kushibot_workspace_edit_gates_v1 SET owner_token = owner_token WHERE scope_id = ? AND project_id = ? AND workspace_id = ? AND owner_token = ?",
  "insertFile": "INSERT INTO kushibot_workspace_files_v1 (scope_id, project_id, workspace_id, path, revision, content, baseline_content) VALUES (?, ?, ?, ?, 0, ?, NULL)",
  "updateFile": "UPDATE kushibot_workspace_files_v1 SET revision = ?, content = ? WHERE scope_id = ? AND project_id = ? AND workspace_id = ? AND path = ? AND revision = ?" ,
  "quota": "SELECT COUNT(*) AS file_count, COALESCE(SUM(length(CAST(content AS BLOB))), 0) AS content_bytes FROM kushibot_workspace_files_v1 WHERE scope_id = ? AND project_id = ? AND workspace_id = ?"
});
