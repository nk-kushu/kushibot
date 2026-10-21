import type { IStepAttemptJournal } from "./IStepAttemptJournal.js";
import type { IWorkflowRunStore } from "./IWorkflowRunStore.js";
import type { StepAttemptClaim } from "./StepAttemptClaim.js";
import type { StepAttemptClaimOutcome } from "./StepAttemptClaimOutcome.js";
import type { StepAttemptReceipt } from "./StepAttemptReceipt.js";
import type { StepResultAcceptance } from "./StepResultAcceptance.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { IClock } from "../contracts/runtime/IClock.js";
export class WorkflowStepAttemptJournal implements IStepAttemptJournal{
 constructor(private readonly store:IWorkflowRunStore,private readonly owner:string,private readonly clock:IClock){}
 claim(command:StepAttemptClaim):Promise<StepAttemptClaimOutcome>{return this.store.mutate(run=>run.claim(this.owner,command));}
 prepare(attemptId:string,token:string,input:JsonValue):Promise<void>{return this.store.mutate(run=>run.prepare(this.owner,attemptId,token,input));}
 beginDispatch(attemptId:string,token:string):Promise<boolean>{return this.store.mutate(run=>run.dispatch(this.owner,attemptId,token));}
 recordOutcome(attemptId:string,token:string,outcome:ExecutionOutcome<JsonValue>):Promise<void>{return this.store.mutate(run=>run.record(this.owner,attemptId,token,outcome));}
 commit(attemptId:string,token:string,acceptance:StepResultAcceptance,context:IExecutionContext):Promise<StepAttemptReceipt>{return this.store.mutate(run=>run.commit(this.owner,attemptId,token,acceptance,context,this.clock.nowEpochMs()));}
}
