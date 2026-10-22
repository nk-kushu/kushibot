import type { DebugEventStatements } from "./DebugEventStatements.js";
export const sqliteDebugEventStatements: DebugEventStatements = Object.freeze({
  "schema": [
    "CREATE TABLE IF NOT EXISTS kushibot_debug_streams (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, stream_id TEXT NOT NULL, next_sequence BIGINT NOT NULL, PRIMARY KEY (scope_id, project_id, stream_id))",
    "CREATE TABLE IF NOT EXISTS kushibot_debug_events (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, event_id TEXT NOT NULL, stream_id TEXT NOT NULL, sequence BIGINT NOT NULL, recorded_at_epoch_ms BIGINT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, event_id), UNIQUE (scope_id, project_id, stream_id, sequence))"
  ],
  "ensureStream": "INSERT INTO kushibot_debug_streams (scope_id, project_id, stream_id, next_sequence) VALUES (?, ?, ?, 0) ON CONFLICT DO NOTHING",
  "lockStream": "UPDATE kushibot_debug_streams SET next_sequence = next_sequence WHERE scope_id = ? AND project_id = ? AND stream_id = ?",
  "find": "SELECT stream_id, sequence, recorded_at_epoch_ms, payload FROM kushibot_debug_events WHERE scope_id = ? AND project_id = ? AND event_id = ?",
  "counter": "SELECT next_sequence FROM kushibot_debug_streams WHERE scope_id = ? AND project_id = ? AND stream_id = ?",
  "advance": "UPDATE kushibot_debug_streams SET next_sequence = ? WHERE scope_id = ? AND project_id = ? AND stream_id = ?",
  "insert": "INSERT INTO kushibot_debug_events (scope_id, project_id, event_id, stream_id, sequence, recorded_at_epoch_ms, payload) VALUES (?, ?, ?, ?, ?, ?, ?)",
  "page": "SELECT stream_id, sequence, recorded_at_epoch_ms, payload FROM kushibot_debug_events WHERE scope_id = ? AND project_id = ? AND stream_id = ? AND sequence > ? ORDER BY sequence ASC LIMIT ?"
});
