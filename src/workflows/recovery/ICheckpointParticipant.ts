import type { RegistrationRef } from "../../contracts/RegistrationRef.js";
import type { ArtifactRef } from "../../artifacts/ArtifactRef.js";
import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
export interface ICheckpointParticipant{readonly registration:RegistrationRef;capture(run:WorkflowRunSnapshot,context:IExecutionContext):Promise<ArtifactRef>;restore(reference:ArtifactRef,run:WorkflowRunSnapshot,context:IExecutionContext):Promise<boolean>;}
