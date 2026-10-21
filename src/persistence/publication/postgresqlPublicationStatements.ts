import type { PublicationStatements } from "./PublicationStatements.js";
import { sqlitePublicationStatements } from "./sqlitePublicationStatements.js";
export const postgresqlPublicationStatements:PublicationStatements=Object.freeze({schema:sqlitePublicationStatements.schema,
 insert:"INSERT INTO kushibot_publications_v1(scope_id,project_id,workspace_key,proposal_id,operation_id,payload) VALUES ($1,$2,$3,$4,NULL,$5) ON CONFLICT(scope_id,project_id,workspace_key,proposal_id) DO NOTHING",
 read:"SELECT proposal_id,operation_id,payload FROM kushibot_publications_v1 WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND proposal_id=$4",
 lock:"UPDATE kushibot_publications_v1 SET payload=payload WHERE scope_id=$1 AND project_id=$2 AND workspace_key=$3 AND proposal_id=$4",
 update:"UPDATE kushibot_publications_v1 SET operation_id=$1,payload=$2 WHERE scope_id=$3 AND project_id=$4 AND workspace_key=$5 AND proposal_id=$6"});
