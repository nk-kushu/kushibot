import type { ConversationStatements } from "./ConversationStatements.js";

export const sqliteConversationStatements: ConversationStatements = Object.freeze({
  schema: Object.freeze([
    `CREATE TABLE IF NOT EXISTS kushibot_conversation_threads_v1 (
      scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_key TEXT NOT NULL,
      thread_id TEXT NOT NULL, title TEXT NOT NULL, created_at BIGINT NOT NULL,
      next_sequence BIGINT NOT NULL CHECK(next_sequence >= 1),
      PRIMARY KEY(scope_id, project_id, workspace_key, thread_id))`,
    `CREATE TABLE IF NOT EXISTS kushibot_conversation_messages_v1 (
      scope_id TEXT NOT NULL, project_id TEXT NOT NULL, workspace_key TEXT NOT NULL,
      thread_id TEXT NOT NULL, message_id TEXT NOT NULL, command_id TEXT NOT NULL,
      sequence BIGINT NOT NULL CHECK(sequence >= 1), role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      text TEXT NOT NULL, created_at BIGINT NOT NULL, run_id TEXT, session_id TEXT,
      PRIMARY KEY(scope_id, project_id, workspace_key, thread_id, message_id),
      UNIQUE(scope_id, project_id, workspace_key, thread_id, command_id),
      UNIQUE(scope_id, project_id, workspace_key, thread_id, sequence),
      FOREIGN KEY(scope_id, project_id, workspace_key, thread_id)
        REFERENCES kushibot_conversation_threads_v1(scope_id, project_id, workspace_key, thread_id))`,
  ]),
  insertThread: `INSERT INTO kushibot_conversation_threads_v1
    (scope_id,project_id,workspace_key,thread_id,title,created_at,next_sequence)
    VALUES (?,?,?,?,?,?,1) ON CONFLICT(scope_id,project_id,workspace_key,thread_id) DO NOTHING`,
  readThread: `SELECT thread_id,title,created_at,next_sequence FROM kushibot_conversation_threads_v1
    WHERE scope_id=? AND project_id=? AND workspace_key=? AND thread_id=?`,
  listThreads: `SELECT thread_id,title,created_at,next_sequence FROM kushibot_conversation_threads_v1
    WHERE scope_id=? AND project_id=? AND workspace_key=? AND thread_id COLLATE BINARY > ?
    ORDER BY thread_id COLLATE BINARY ASC LIMIT ?`,
  lockThread: `UPDATE kushibot_conversation_threads_v1 SET next_sequence=next_sequence
    WHERE scope_id=? AND project_id=? AND workspace_key=? AND thread_id=?`,
  advanceSequence: `UPDATE kushibot_conversation_threads_v1 SET next_sequence=?
    WHERE scope_id=? AND project_id=? AND workspace_key=? AND thread_id=? AND next_sequence=?`,
  readIdentity: `SELECT * FROM kushibot_conversation_messages_v1
    WHERE scope_id=? AND project_id=? AND workspace_key=? AND thread_id=? AND (message_id=? OR command_id=?)`,
  insertMessage: `INSERT INTO kushibot_conversation_messages_v1
    (scope_id,project_id,workspace_key,thread_id,message_id,command_id,sequence,role,text,created_at,run_id,session_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  readMessage: `SELECT * FROM kushibot_conversation_messages_v1
    WHERE scope_id=? AND project_id=? AND workspace_key=? AND thread_id=? AND message_id=?`,
  listMessages: `SELECT * FROM kushibot_conversation_messages_v1
    WHERE scope_id=? AND project_id=? AND workspace_key=? AND thread_id=? AND sequence>?
    ORDER BY sequence ASC LIMIT ?`,
});
