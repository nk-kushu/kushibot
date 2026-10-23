import type { ConversationStatements } from "./ConversationStatements.js";
import { sqliteConversationStatements } from "./sqliteConversationStatements.js";

/** Same schema; native positional parameters and deterministic ID collation. */
export const postgresqlConversationStatements: ConversationStatements = Object.freeze({
  schema: sqliteConversationStatements.schema,
  insertThread: `INSERT INTO kushibot_conversation_threads_v1
    (scope_id,project_id,workspace_key,thread_id,title,created_at,next_sequence)
    VALUES ($1,$2,$3,$4,$5,$6,1) ON CONFLICT(scope_id,project_id,workspace_key,thread_id) DO NOTHING`,
  readThread: `SELECT thread_id,title,created_at,next_sequence FROM kushibot_conversation_threads_v1
    WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND thread_id=$4`,
  listThreads: `SELECT thread_id,title,created_at,next_sequence FROM kushibot_conversation_threads_v1
    WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND thread_id COLLATE "C" > $4 COLLATE "C"
    ORDER BY thread_id COLLATE "C" ASC LIMIT $5`,
  lockThread: `UPDATE kushibot_conversation_threads_v1 SET next_sequence=next_sequence
    WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND thread_id=$4`,
  advanceSequence: `UPDATE kushibot_conversation_threads_v1 SET next_sequence=$1
    WHERE scope_id=$2 AND project_id=$3 AND workspace_key=$4 AND thread_id=$5 AND next_sequence=$6`,
  readIdentity: `SELECT * FROM kushibot_conversation_messages_v1
    WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND thread_id=$4 AND (message_id=$5 OR command_id=$6)`,
  insertMessage: `INSERT INTO kushibot_conversation_messages_v1
    (scope_id,project_id,workspace_key,thread_id,message_id,command_id,sequence,role,text,created_at,run_id,session_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
  readMessage: `SELECT * FROM kushibot_conversation_messages_v1
    WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND thread_id=$4 AND message_id=$5`,
  listMessages: `SELECT * FROM kushibot_conversation_messages_v1
    WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND thread_id=$4 AND sequence>$5
    ORDER BY sequence ASC LIMIT $6`,
});
