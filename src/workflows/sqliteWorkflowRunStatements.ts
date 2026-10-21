import type { WorkflowRunStatements } from "./WorkflowRunStatements.js";
export const sqliteWorkflowRunStatements:WorkflowRunStatements=Object.freeze({
 schema:"CREATE TABLE IF NOT EXISTS kushibot_workflow_runs_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, run_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(scope_id, project_id, run_id))",
 insert:"INSERT INTO kushibot_workflow_runs_v1(scope_id, project_id, run_id, payload) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
 lock:"UPDATE kushibot_workflow_runs_v1 SET payload = payload WHERE scope_id = ? AND project_id = ? AND run_id = ?",
 read:"SELECT payload FROM kushibot_workflow_runs_v1 WHERE scope_id = ? AND project_id = ? AND run_id = ?",
 update:"UPDATE kushibot_workflow_runs_v1 SET payload = ? WHERE scope_id = ? AND project_id = ? AND run_id = ?"
});
