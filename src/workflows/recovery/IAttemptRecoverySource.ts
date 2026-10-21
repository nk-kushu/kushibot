import type { WorkflowStepAttempt } from "../WorkflowStepAttempt.js";
import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot.js";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { RecoveryObservation } from "./RecoveryObservation.js";
export interface IAttemptRecoverySource{read(attempt:WorkflowStepAttempt,run:WorkflowRunSnapshot,context:IExecutionContext):Promise<RecoveryObservation<ExecutionOutcome<JsonValue>>>;}
