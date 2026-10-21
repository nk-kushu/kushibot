import type { IStepAttemptJournal } from "../../src/workflows/IStepAttemptJournal.js";
import type { StepAttemptClaim } from "../../src/workflows/StepAttemptClaim.js";
import type { StepAttemptClaimOutcome } from "../../src/workflows/StepAttemptClaimOutcome.js";
import type { StepAttemptReceipt } from "../../src/workflows/StepAttemptReceipt.js";
import type { StepResultAcceptance } from "../../src/workflows/StepResultAcceptance.js";
import type { AcceptedStepResult } from "../../src/workflows/AcceptedStepResult.js";
import type { WorkflowDefinition } from "../../src/workflows/WorkflowDefinition.js";
import type { ExecutionScopeRef } from "../../src/contracts/runtime/ExecutionScopeRef.js";
import type { IClock } from "../../src/contracts/runtime/IClock.js";
import type { IExecutionContext } from "../../src/executors/contracts/IExecutionContext.js";
import type { JsonValue } from "../../src/contracts/persistence/JsonValue.js";
import type { ExecutionOutcome } from "../../src/contracts/outcomes/ExecutionOutcome.js";
import type { MemoryStepAttemptEntry } from "./MemoryStepAttemptEntry.js";
import { StepExecutionError } from "../../src/errors/StepExecutionError.js";
export class MemoryStepAttemptJournal implements IStepAttemptJournal{
  private readonly commands=new Map<string,MemoryStepAttemptEntry>();
  private readonly attempts=new Map<string,MemoryStepAttemptEntry>();
  private readonly accepted=new Map<string,AcceptedStepResult>();
  constructor(private readonly definition:WorkflowDefinition,
    private readonly runId:string,
    private readonly scope:ExecutionScopeRef,
    private readonly clock:IClock,seed:readonly AcceptedStepResult[]=[]){for(const result of seed)this.accepted.set(result.stepId,result);}
  async claim(command:StepAttemptClaim):Promise<StepAttemptClaimOutcome>{
    const old=this.commands.get(command.commandId);if(old!==undefined){if(this.key(old.claim)!==this.key(command))throw new StepExecutionError();return {status:"existing",outcome:old.receipt!==null?{status:"recorded",receipt:old.receipt}:{status:"pending",attemptId:old.claim.attemptId,pendingOperationRefs:[old.claim.operationId]}};}
    const step=this.definition.steps.find(value=>value.id===command.step.id);
    if(command.runId!==this.runId||
        this.canonical(command.scope)!==this.canonical(this.scope)||
        command.workflow.id!==this.definition.id||
        command.workflow.version!==this.definition.version||
        step===undefined||
        this.canonical(step)!==this.canonical(command.step)||
        command.maxRunAttempts!==this.definition.maxTotalAttempts)throw new StepExecutionError();
    if([...this.attempts.values()].some(entry=>entry.receipt===null||
        (entry.outcome!==null&&entry.outcome.status!=="completed"&&entry.outcome.pendingOperationRefs.length>0)))return {status:"blocked",code:"STEP_ATTEMPT_BUSY"};
    if(this.attempts.size>=this.definition.maxTotalAttempts)return {status:"blocked",code:"RUN_ATTEMPT_LIMIT"};
    const attemptNumber=[...this.attempts.values()].filter(entry=>entry.claim.step.id===step.id).length+1;if(attemptNumber>step.maxAttempts)return {status:"blocked",code:"STEP_ATTEMPT_LIMIT"};
    if(!this.current(command))return {status:"blocked",code:"DEPENDENCY_NOT_ACCEPTED"};
    if(this.accepted.has(step.id))return {status:"blocked",code:"STEP_ALREADY_ACCEPTED"};
    if(this.attempts.has(command.attemptId))throw new StepExecutionError();
    const entry:MemoryStepAttemptEntry={claim:command,attemptNumber,stage:"claimed",input:null,outcome:null,receipt:null};this.commands.set(command.commandId,entry);this.attempts.set(command.attemptId,entry);return {status:"admitted",attemptNumber};
  }
  async prepare(attemptId:string,ownerToken:string,input:JsonValue):Promise<void>{const entry=this.own(attemptId,ownerToken);if(entry.stage!=="claimed")throw new StepExecutionError();entry.input=input;entry.stage="prepared";}
  async beginDispatch(attemptId:string,ownerToken:string):Promise<boolean>{const entry=this.own(attemptId,ownerToken);if(entry.stage!=="prepared")return false;entry.stage="dispatching";return true;}
  async recordOutcome(attemptId:string,ownerToken:string,outcome:ExecutionOutcome<JsonValue>):Promise<void>{const entry=this.own(attemptId,ownerToken);if(entry.outcome!==null&&this.canonical(entry.outcome)!==this.canonical(outcome))throw new StepExecutionError();entry.outcome=outcome;entry.stage="outcome";}
  async commit(attemptId:string,ownerToken:string,acceptance:StepResultAcceptance,context:IExecutionContext):Promise<StepAttemptReceipt>{
    const entry=this.own(attemptId,ownerToken);if(entry.receipt!==null)return entry.receipt;if(entry.outcome===null)throw new StepExecutionError();
    let actual=acceptance;
    if(actual.status==="accepted"&&(context.signal.aborted||
        (context.deadlineEpochMs!==null&&this.clock.nowEpochMs()>=context.deadlineEpochMs)||
        !this.current(entry.claim)))actual={status:"not-evaluated",code:"COMMIT_PRECONDITION_CHANGED",message:"Candidate retained; commit controls or dependencies changed."};
    if(actual.status==="accepted"&&entry.outcome.status!=="completed")throw new StepExecutionError();
    const claim=entry.claim;entry.receipt=Object.freeze({attemptId,stepRunId:claim.stepRunId,runId:claim.runId,stepId:claim.step.id,attemptNumber:entry.attemptNumber,workflow:claim.workflow,executor:claim.step.executor,viewRef:claim.view.viewRef,receiptRef:"step-receipt:"+attemptId,outcome:entry.outcome,acceptance:actual});
    if(actual.status==="accepted"&&entry.outcome.status==="completed")this.accepted.set(claim.step.id,Object.freeze({stepId:claim.step.id,attemptId,receiptRef:entry.receipt.receiptRef,result:entry.outcome.result}));return entry.receipt;
  }
  acceptedResult(stepId:string):AcceptedStepResult|null{return this.accepted.get(stepId)??null;}
  savedOutcome(attemptId:string):ExecutionOutcome<JsonValue>|null{return this.attempts.get(attemptId)?.outcome??null;}
  count():number{return this.attempts.size;}
  private own(attemptId:string,ownerToken:string):MemoryStepAttemptEntry{const entry=this.attempts.get(attemptId);if(entry===undefined||
        entry.claim.ownerToken!==ownerToken)throw new StepExecutionError();return entry;}
  private current(command:StepAttemptClaim):boolean{return command.step.dependencies.length===command.view.dependencies.length&&command.view.dependencies.every(dependency=>this.canonical(this.accepted.get(dependency.stepId))===this.canonical(dependency));}
  private key(command:StepAttemptClaim):string{return this.canonical({runId:command.runId,scope:command.scope,workflow:command.workflow,step:command.step,stepRunId:command.stepRunId,view:command.view,maxRunAttempts:command.maxRunAttempts});}
  private canonical(value:unknown):string{return JSON.stringify(value,(_key,item:unknown)=>item!==null&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([left],[right])=>left<right?-1:left>right?1:0)):item);}
}
