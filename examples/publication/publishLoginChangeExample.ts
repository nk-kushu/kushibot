import type { IExecutionContext, PublicationEvidenceRef, PublicationOutcome } from "../../src/index.js";
import { PublicationCoordinator } from "../../src/index.js";
export async function publishLoginChangeExample(publication:PublicationCoordinator,proposalId:string,approvalRef:string,evidence:PublicationEvidenceRef,context:IExecutionContext):Promise<PublicationOutcome>{
 const result=await publication.publish(proposalId,approvalRef,evidence,context);
 // waiting-for-approval: the host displays the exact manifest/target to an authorized human.
 // blocked/stopped: preserve the proposal and unresolved review/check/control reason.
 // pending: show the operation ID; a later administrative call uses reconcile().
 // recorded: inspect effect.status; not-applied is different from published.
 return result;
}
