import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { RecoveryObservation } from "./RecoveryObservation.js";
export interface IEffectRecoverySource{read(operationRef:string,run:WorkflowRunSnapshot,context:IExecutionContext):Promise<RecoveryObservation<Readonly<{settled:true}>>>;}
