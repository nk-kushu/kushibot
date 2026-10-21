import type { ArtifactRef } from "../../artifacts/ArtifactRef.js";
import type { RegistrationRef } from "../../contracts/RegistrationRef.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
export type ExecutionCheckpointManifest=Readonly<{schemaVersion:1;checkpointId:string;runId:string;scope:ExecutionScopeRef;runRevision:number;proofRef:string;run:ArtifactRef;usage:ArtifactRef;participants:readonly Readonly<{registration:RegistrationRef;reference:ArtifactRef}>[]}>;
