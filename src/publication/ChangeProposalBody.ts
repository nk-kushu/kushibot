import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { RegistrationRef } from "../contracts/RegistrationRef.js";
import type { PublicationChange } from "./PublicationChange.js";
export type ChangeProposalBody=Readonly<{id:string;scope:ExecutionScopeRef;summary:string;sourceSnapshotRef:string;targetId:string;targetRevision:string;policy:RegistrationRef;changes:readonly PublicationChange[]}>;
