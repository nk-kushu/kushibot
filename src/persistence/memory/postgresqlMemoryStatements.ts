import type { MemoryStatements } from "./MemoryStatements.js";
import { sqliteMemoryStatements } from "./sqliteMemoryStatements.js";
export const postgresqlMemoryStatements:MemoryStatements=Object.freeze({
 schema:sqliteMemoryStatements.schema,index:'CREATE INDEX IF NOT EXISTS kushibot_agent_memory_topic_v1 ON kushibot_agent_memory_v1(scope_id,project_id,workspace_key,topic,state,memory_id COLLATE "C")',
 insert:"INSERT INTO kushibot_agent_memory_v1(scope_id,project_id,workspace_key,memory_id,topic,state,payload) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(scope_id,project_id,workspace_key,memory_id) DO NOTHING",
 read:"SELECT memory_id,topic,state,payload FROM kushibot_agent_memory_v1 WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND memory_id=$4",
 lock:"UPDATE kushibot_agent_memory_v1 SET payload=payload WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND memory_id=$4",
 update:"UPDATE kushibot_agent_memory_v1 SET state=$1,payload=$2 WHERE scope_id=$3 AND project_id=$4 AND workspace_key=$5 AND memory_id=$6",
 list:'SELECT memory_id,topic,state,payload FROM kushibot_agent_memory_v1 WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND topic=$4 AND state=\'accepted\' AND memory_id COLLATE "C">$5 COLLATE "C" ORDER BY memory_id COLLATE "C" ASC LIMIT $6'
});
