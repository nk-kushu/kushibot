import type { ISqlDatabase, PublicationStatements, IArtifactDigest, IExecutionContext, TrustedPublicationApproval, IPublicationTarget, PublicationReceipt, ITrustedPublicationApprovalReader } from "../../src/index.js";
import { createPublicationExample } from "../../examples/publication/createPublicationExample.js";
export async function checkPublicationFlow(database:ISqlDatabase,sql:PublicationStatements,digest:IArtifactDigest):Promise<void>{
 const scope=Object.freeze({scopeId:"publication-check",projectId:"project",workspaceId:"workspace"}),clock={nowEpochMs:()=>100};
 const context:IExecutionContext={identity:{operationId:"publish-login"},scope,signal:new AbortController().signal,deadlineEpochMs:10000,reporter:{async progress(){}}};
 let approval:TrustedPublicationApproval|null=null,applies=0;let actual:PublicationReceipt|null=null;
 const approvals:ITrustedPublicationApprovalReader={async read(reference){return reference==="fixture:approval"?approval:null;}};
 const target:IPublicationTarget={async apply(proposal,command){applies++;actual={operationId:command.operationId,proposalDigest:proposal.digest,targetId:proposal.targetId,beforeRevision:proposal.targetRevision,afterRevision:"target:2",receiptRef:"fixture:target-receipt"};throw new Error("Fixture lost target response after recording its effect.");},async reconcile(){return actual===null?{status:"unknown"}:{status:"published",receipt:actual};}};
 const services=await createPublicationExample(database,sql,scope,digest,approvals,{async verify(){return true;}},target,clock);
 const content=new TextEncoder().encode("new"),hash=await digest.hash(content);
 const prepared=await services.proposals.create({id:"login-proposal",scope,summary:"Add the reviewed login change.",sourceSnapshotRef:"source:isolated-v2",targetId:"original-login",targetRevision:"target:1",policy:{id:"login-publication",version:"1"},changes:[{path:"src/login.ts",beforeDigest:null,after:{artifactId:"change-login",digest:hash,byteLength:content.byteLength,mediaType:"text/plain",schemaId:null,schemaVersion:null}}]},context);
 const check=(value:boolean):void=>{if(!value)throw new Error("Publication acceptance check failed.");};
 const evidence={reviewRef:"fixture:review",verificationRef:"fixture:verification"};
 check((await services.publication.publish(prepared.proposal.id,"fixture:approval",evidence,context)).status==="waiting-for-approval");check(applies===0);
 approval={approvalId:"human-approval",principalRef:"fixture:authorized-human",receiptRef:"fixture:approval-receipt",decision:"approved",scope,proposalDigest:prepared.proposal.digest,targetId:prepared.proposal.targetId,targetRevision:prepared.proposal.targetRevision,expiresAtEpochMs:9000};
 check((await services.publication.publish(prepared.proposal.id,"fixture:approval",evidence,context)).status==="pending");check(applies===1);
 check((await services.publication.publish(prepared.proposal.id,"fixture:approval",evidence,context)).status==="pending");check(applies===1);
 const reconciled=await services.publication.reconcile(prepared.proposal.id,context);check(reconciled.status==="recorded"&&reconciled.record.effect?.status==="published");
 const reopened=await createPublicationExample(database,sql,scope,digest,approvals,{async verify(){return true;}},target,clock);
 check((await reopened.store.get(prepared.proposal.id))?.effect?.status==="published");check(applies===1);
}
