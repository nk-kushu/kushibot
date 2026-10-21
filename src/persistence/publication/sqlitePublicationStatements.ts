import type { PublicationStatements } from "./PublicationStatements.js";
export const sqlitePublicationStatements:PublicationStatements=Object.freeze({
 schema:"CREATE TABLE IF NOT EXISTS kushibot_publications_v1 (scope_id TEXT NOT NULL,project_id TEXT NOT NULL,workspace_key TEXT NOT NULL,proposal_id TEXT NOT NULL,operation_id TEXT,payload TEXT NOT NULL,PRIMARY KEY(scope_id,project_id,workspace_key,proposal_id),UNIQUE(scope_id,project_id,workspace_key,operation_id))",
 insert:"INSERT INTO kushibot_publications_v1(scope_id,project_id,workspace_key,proposal_id,operation_id,payload) VALUES (?,?,?,?,NULL,?) ON CONFLICT(scope_id,project_id,workspace_key,proposal_id) DO NOTHING",
 read:"SELECT proposal_id,operation_id,payload FROM kushibot_publications_v1 WHERE scope_id=? AND project_id=? AND workspace_key=? AND proposal_id=?",
 lock:"UPDATE kushibot_publications_v1 SET payload=payload WHERE scope_id=? AND project_id=? AND workspace_key=? AND proposal_id=?",
 update:"UPDATE kushibot_publications_v1 SET operation_id=?,payload=? WHERE scope_id=? AND project_id=? AND workspace_key=? AND proposal_id=?"
});
