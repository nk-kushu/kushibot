import type { StepAttemptClaim } from "./StepAttemptClaim.js";
import type { StepAttemptClaimOutcome } from "./StepAttemptClaimOutcome.js";
import type { StepResultAcceptance } from "./StepResultAcceptance.js";
import type { StepAttemptReceipt } from "./StepAttemptReceipt.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export interface IStepAttemptJournal{
  claim(command:StepAttemptClaim):Promise<StepAttemptClaimOutcome>;
  prepare(attemptId:string,ownerToken:string,input:JsonValue):Promise<void>;
  beginDispatch(attemptId:string,ownerToken:string):Promise<boolean>;
  recordOutcome(attemptId:string,ownerToken:string,outcome:ExecutionOutcome<JsonValue>):Promise<void>;
  commit(attemptId:string,ownerToken:string,acceptance:StepResultAcceptance,context:IExecutionContext):Promise<StepAttemptReceipt>;
}
