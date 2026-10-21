import type { ArtifactStatements } from "../artifacts/ArtifactStatements.js";

export const postgresqlArtifactStatements: ArtifactStatements = Object.freeze({
  schema: Object.freeze([
    "CREATE TABLE IF NOT EXISTS kushibot_schema_versions (name TEXT PRIMARY KEY, version INTEGER NOT NULL CHECK (version > 0))",
    "CREATE TABLE IF NOT EXISTS kushibot_artifact_scopes (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, revision BIGINT NOT NULL, PRIMARY KEY(scope_id, project_id))",
    "CREATE TABLE IF NOT EXISTS kushibot_artifacts (\nscope_id TEXT NOT NULL, project_id TEXT NOT NULL, artifact_id TEXT NOT NULL,\nproducer_operation_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, byte_length BIGINT NOT NULL CHECK(byte_length >= 0), metadata TEXT NOT NULL,\nPRIMARY KEY(scope_id, project_id, artifact_id), UNIQUE(scope_id, project_id, producer_operation_id, idempotency_key))",
    "CREATE TABLE IF NOT EXISTS kushibot_artifact_chunks (\nscope_id TEXT NOT NULL, project_id TEXT NOT NULL, artifact_id TEXT NOT NULL, chunk_index INTEGER NOT NULL CHECK(chunk_index >= 0), content TEXT NOT NULL,\nPRIMARY KEY(scope_id, project_id, artifact_id, chunk_index))",
    "CREATE TABLE IF NOT EXISTS kushibot_artifact_pins (\nscope_id TEXT NOT NULL, project_id TEXT NOT NULL, artifact_id TEXT NOT NULL, pin_id TEXT NOT NULL,\nPRIMARY KEY(scope_id, project_id, artifact_id, pin_id))",
  ]),
  readVersion: "SELECT version FROM kushibot_schema_versions WHERE name = 'artifacts'",
  installVersion: "INSERT INTO kushibot_schema_versions(name, version) VALUES('artifacts', 1)",
  ensureScope: "INSERT INTO kushibot_artifact_scopes(scope_id, project_id, revision) VALUES($1, $2, 0) ON CONFLICT(scope_id, project_id) DO NOTHING",
  lockScope: "UPDATE kushibot_artifact_scopes SET revision = revision + 1 WHERE scope_id = $1 AND project_id = $2",
  totals: "SELECT COUNT(*) AS object_count, COALESCE(SUM(byte_length), 0) AS byte_count FROM kushibot_artifacts WHERE scope_id = $1 AND project_id = $2",
  findOperation: "SELECT metadata FROM kushibot_artifacts WHERE scope_id = $1 AND project_id = $2 AND producer_operation_id = $3 AND idempotency_key = $4",
  load: "SELECT metadata FROM kushibot_artifacts WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3",
  insertMetadata: "INSERT INTO kushibot_artifacts(scope_id, project_id, artifact_id, producer_operation_id, idempotency_key, byte_length, metadata) VALUES($1,$2,$3,$4,$5,$6,$7)",
  insertChunk: "INSERT INTO kushibot_artifact_chunks(scope_id, project_id, artifact_id, chunk_index, content) VALUES($1,$2,$3,$4,$5)",
  readChunk: "SELECT content FROM kushibot_artifact_chunks WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3 AND chunk_index = $4",
  countPins: "SELECT COUNT(*) AS pin_count FROM kushibot_artifact_pins WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3",
  hasPin: "SELECT pin_id FROM kushibot_artifact_pins WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3 AND pin_id = $4",
  insertPin: "INSERT INTO kushibot_artifact_pins(scope_id, project_id, artifact_id, pin_id) VALUES($1,$2,$3,$4) ON CONFLICT(scope_id, project_id, artifact_id, pin_id) DO NOTHING",
  deletePin: "DELETE FROM kushibot_artifact_pins WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3 AND pin_id = $4",
  deleteChunks: "DELETE FROM kushibot_artifact_chunks WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3",
  deleteMetadata: "DELETE FROM kushibot_artifacts WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3",
});
