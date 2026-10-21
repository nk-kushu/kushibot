import type { ChangeProposal } from "./ChangeProposal.js";
import type { PublicationCommand } from "./PublicationCommand.js";
import type { PublicationEffectOutcome } from "./PublicationEffectOutcome.js";
export type PublicationRecord=Readonly<{schemaVersion:1;revision:number;proposal:ChangeProposal;command:PublicationCommand|null;effect:Exclude<PublicationEffectOutcome,Readonly<{status:"unknown"}>>|null}>;
