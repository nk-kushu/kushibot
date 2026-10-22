import type { DebugEventStatements } from "./DebugEventStatements.js";
export const postgresqlDebugEventStatements: DebugEventStatements = Object.freeze({
  "schema": [
    "CREATE TABLE IF NOT EXISTS kushibot_debug_streams (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, stream_id TEXT NOT NULL, next_sequence BIGINT NOT NULL, PRIMARY KEY (scope_id, project_id, stream_id))",
    "CREATE TABLE IF NOT EXISTS kushibot_debug_events (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, event_id TEXT NOT NULL, stream_id TEXT NOT NULL, sequence BIGINT NOT NULL, recorded_at_epoch_ms BIGINT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, event_id), UNIQUE (scope_id, project_id, stream_id, sequence))"
  ],
  "ensureStream": "INSERT INTO kushibot_debug_streams (scope_id, project_id, stream_id, next_sequence) VALUES ($1, $2, $3, 0) ON CONFLICT DO NOTHING",
  "lockStream": "UPDATE kushibot_debug_streams SET next_sequence = next_sequence WHERE scope_id = $1 AND project_id = $2 AND stream_id = $3",
  "find": "SELECT stream_id, sequence, recorded_at_epoch_ms, payload FROM kushibot_debug_events WHERE scope_id = $1 AND project_id = $2 AND event_id = $3",
  "counter": "SELECT next_sequence FROM kushibot_debug_streams WHERE scope_id = $1 AND project_id = $2 AND stream_id = $3",
  "advance": "UPDATE kushibot_debug_streams SET next_sequence = $1 WHERE scope_id = $2 AND project_id = $3 AND stream_id = $4",
  "insert": "INSERT INTO kushibot_debug_events (scope_id, project_id, event_id, stream_id, sequence, recorded_at_epoch_ms, payload) VALUES ($1, $2, $3, $4, $5, $6, $7)",
  "page": "SELECT stream_id, sequence, recorded_at_epoch_ms, payload FROM kushibot_debug_events WHERE scope_id = $1 AND project_id = $2 AND stream_id = $3 AND sequence > $4 ORDER BY sequence ASC LIMIT $5"
});
