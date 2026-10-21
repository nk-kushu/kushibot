import type { ISqlDatabase, PublicationStatements, ExecutionScopeRef, IArtifactDigest, ITrustedPublicationApprovalReader, IPublicationEvidenceVerifier, IPublicationTarget, IClock } from "../../src/index.js";
import { JsonValueContract, JsonRecordCodec, ChangeProposalContract, PublicationRecordContract, SqlPublicationStore, ChangeProposalService, PublicationCoordinator } from "../../src/index.js";
export async function createPublicationExample(database:ISqlDatabase,sql:PublicationStatements,scope:ExecutionScopeRef,digest:IArtifactDigest,approvals:ITrustedPublicationApprovalReader,evidence:IPublicationEvidenceVerifier,target:IPublicationTarget,clock:IClock){
 const json=new JsonValueContract(),proposals=new ChangeProposalContract(json,digest),records=new PublicationRecordContract(json,proposals);
 const store=new SqlPublicationStore(database,sql,new JsonRecordCodec(records,json,131072),scope);await store.initialize();
 return Object.freeze({store,proposals:new ChangeProposalService(store,json,digest,proposals,clock),publication:new PublicationCoordinator(store,approvals,evidence,target,records,clock)});
}
