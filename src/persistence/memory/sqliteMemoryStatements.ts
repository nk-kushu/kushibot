import type { MemoryStatements } from "./MemoryStatements.js";
export const sqliteMemoryStatements:MemoryStatements=Object.freeze({
 schema:"CREATE TABLE IF NOT EXISTS kushibot_agent_memory_v1 (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_key TEXT NOT NULL, memory_id TEXT NOT NULL, topic TEXT NOT NULL, state TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(scope_id,project_id,workspace_key,memory_id))",
 index:"CREATE INDEX IF NOT EXISTS kushibot_agent_memory_topic_v1 ON kushibot_agent_memory_v1(scope_id,project_id,workspace_key,topic,state,memory_id)",
 insert:"INSERT INTO kushibot_agent_memory_v1(scope_id,project_id,workspace_key,memory_id,topic,state,payload) VALUES (?,?,?,?,?,?,?) ON CONFLICT(scope_id,project_id,workspace_key,memory_id) DO NOTHING",
 read:"SELECT memory_id,topic,state,payload FROM kushibot_agent_memory_v1 WHERE scope_id=? AND project_id=? AND workspace_key=? AND memory_id=?",
 lock:"UPDATE kushibot_agent_memory_v1 SET payload=payload WHERE scope_id=? AND project_id=? AND workspace_key=? AND memory_id=?",
 update:"UPDATE kushibot_agent_memory_v1 SET state=?,payload=? WHERE scope_id=? AND project_id=? AND workspace_key=? AND memory_id=?",
 list:"SELECT memory_id,topic,state,payload FROM kushibot_agent_memory_v1 WHERE scope_id=? AND project_id=? AND workspace_key=? AND topic=? AND state='accepted' AND memory_id>? ORDER BY memory_id ASC LIMIT ?"
});
