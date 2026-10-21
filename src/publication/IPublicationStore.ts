import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { ChangeProposal } from "./ChangeProposal.js";
import type { PublicationRecord } from "./PublicationRecord.js";
import type { PublicationCommand } from "./PublicationCommand.js";
import type { PublicationEffectOutcome } from "./PublicationEffectOutcome.js";
export interface IPublicationStore {
 readonly scope:ExecutionScopeRef;
 initialize():Promise<void>;create(proposal:ChangeProposal):Promise<PublicationRecord>;get(id:string):Promise<PublicationRecord|null>;
 claim(id:string,command:PublicationCommand):Promise<Readonly<{claimed:boolean;record:PublicationRecord}>>;
 finish(id:string,operationId:string,effect:Exclude<PublicationEffectOutcome,Readonly<{status:"unknown"}>>):Promise<PublicationRecord>;
}
