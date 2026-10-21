import type { RegistrationRef } from "../contracts/RegistrationRef.js";
import type { ExecutorMetadata } from "../executors/ExecutorMetadata.js";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { StepResultAcceptance } from "./StepResultAcceptance.js";
export type StepAttemptReceipt=Readonly<{attemptId:string;stepRunId:string;runId:string;stepId:string;attemptNumber:number;workflow:RegistrationRef;executor:ExecutorMetadata;viewRef:string;receiptRef:string;outcome:ExecutionOutcome<JsonValue>;acceptance:StepResultAcceptance}>;
