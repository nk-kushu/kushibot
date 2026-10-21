import type { SubAgentJournalStatements } from "./SubAgentJournalStatements.js";
export const postgresqlSubAgentJournalStatements: SubAgentJournalStatements = Object.freeze({
  schema: "CREATE TABLE IF NOT EXISTS kushibot_sub_agent_runs_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, run_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(scope_id, project_id, run_id))",
  insert: "INSERT INTO kushibot_sub_agent_runs_v1(scope_id, project_id, run_id, payload) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
  lock: "UPDATE kushibot_sub_agent_runs_v1 SET payload = payload WHERE scope_id = $1 AND project_id = $2 AND run_id = $3",
  read: "SELECT payload FROM kushibot_sub_agent_runs_v1 WHERE scope_id = $1 AND project_id = $2 AND run_id = $3",
  update: "UPDATE kushibot_sub_agent_runs_v1 SET payload = $1 WHERE scope_id = $2 AND project_id = $3 AND run_id = $4"
});
