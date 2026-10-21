import type { ChangeProposal } from "./ChangeProposal.js";
import type { PublicationCommand } from "./PublicationCommand.js";
import type { PublicationEffectOutcome } from "./PublicationEffectOutcome.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export interface IPublicationTarget {
 apply(proposal:ChangeProposal,command:PublicationCommand,context:IExecutionContext):Promise<PublicationEffectOutcome>;
 reconcile(proposal:ChangeProposal,command:PublicationCommand,context:IExecutionContext):Promise<PublicationEffectOutcome>;
}
