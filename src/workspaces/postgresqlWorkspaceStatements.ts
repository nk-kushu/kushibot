import type { WorkspaceStatements } from "./WorkspaceStatements.js";
export const postgresqlWorkspaceStatements: WorkspaceStatements = Object.freeze({
  "schema": [
    "CREATE TABLE IF NOT EXISTS kushibot_workspaces_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_id TEXT NOT NULL, baseline_ref TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, workspace_id))",
    "CREATE TABLE IF NOT EXISTS kushibot_workspace_files_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_id TEXT NOT NULL, path TEXT NOT NULL, revision BIGINT NOT NULL, content TEXT, baseline_content TEXT, PRIMARY KEY (scope_id, project_id, workspace_id, path))",
    "CREATE TABLE IF NOT EXISTS kushibot_workspace_edit_gates_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_id TEXT NOT NULL, owner_token TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, workspace_id))"
  ],
  "createWorkspace": "INSERT INTO kushibot_workspaces_v1 (scope_id, project_id, workspace_id, baseline_ref) VALUES ($1, $2, $3, $4)",
  "workspace": "SELECT baseline_ref FROM kushibot_workspaces_v1 WHERE scope_id = $1 AND project_id = $2 AND workspace_id = $3",
  "seed": "INSERT INTO kushibot_workspace_files_v1 (scope_id, project_id, workspace_id, path, revision, content, baseline_content) VALUES ($1, $2, $3, $4, 0, $5, $6)",
  "read": "SELECT revision, CASE WHEN octet_length(content) <= $1 THEN content ELSE NULL END AS content, CASE WHEN octet_length(content) > $2 THEN 1 ELSE 0 END AS too_large FROM kushibot_workspace_files_v1 WHERE scope_id = $3 AND project_id = $4 AND workspace_id = $5 AND path = $6",
  "acquire": "INSERT INTO kushibot_workspace_edit_gates_v1 (scope_id, project_id, workspace_id, owner_token) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
  "release": "DELETE FROM kushibot_workspace_edit_gates_v1 WHERE scope_id = $1 AND project_id = $2 AND workspace_id = $3 AND owner_token = $4",
  "assertOwner": "UPDATE kushibot_workspace_edit_gates_v1 SET owner_token = owner_token WHERE scope_id = $1 AND project_id = $2 AND workspace_id = $3 AND owner_token = $4",
  "insertFile": "INSERT INTO kushibot_workspace_files_v1 (scope_id, project_id, workspace_id, path, revision, content, baseline_content) VALUES ($1, $2, $3, $4, 0, $5, NULL)",
  "updateFile": "UPDATE kushibot_workspace_files_v1 SET revision = $1, content = $2 WHERE scope_id = $3 AND project_id = $4 AND workspace_id = $5 AND path = $6 AND revision = $7" ,
  "quota": "SELECT COUNT(*) AS file_count, COALESCE(SUM(octet_length(content)), 0) AS content_bytes FROM kushibot_workspace_files_v1 WHERE scope_id = $1 AND project_id = $2 AND workspace_id = $3"
});
