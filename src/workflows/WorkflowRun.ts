import type { WorkflowRecoveryRecord } from "./recovery/WorkflowRecoveryRecord.js";
import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot.js";
import type { WorkflowDefinition } from "./WorkflowDefinition.js";
import type { WorkflowStepAttempt } from "./WorkflowStepAttempt.js";
import type { StepDefinition } from "./StepDefinition.js";
import type { StepAttemptClaim } from "./StepAttemptClaim.js";
import type { StepAttemptClaimOutcome } from "./StepAttemptClaimOutcome.js";
import type { StepAttemptReceipt } from "./StepAttemptReceipt.js";
import type { StepResultAcceptance } from "./StepResultAcceptance.js";
import type { StepInputPolicyInput } from "./StepInputPolicyInput.js";
import type { WorkflowTransitionPlan } from "./WorkflowTransitionPlan.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import { ExecutionLifecycle } from "../domain/lifecycle/ExecutionLifecycle.js";
import { workflowRunLifecycle } from "../domain/lifecycle/workflowRunLifecycle.js";
import { StepRun } from "./StepRun.js";
import { canonicalWorkflowValue as same } from "./canonicalWorkflowValue.js";
import { collectWorkflowPartial } from "./collectWorkflowPartial.js";
import { WorkflowRunError } from "../errors/WorkflowRunError.js";
export class WorkflowRun{
  private readonly steps=new Map<string,StepRun>();
  private constructor(private state:WorkflowRunSnapshot,private readonly lifecycle:ExecutionLifecycle){}
  static create(input:Pick<WorkflowRunSnapshot,"runId"|"scope"|"definition"|"request"|"completionPolicy"|"budgetScopeId"|"deadlineEpochMs">):WorkflowRunSnapshot{
    return Object.freeze({...input,schemaVersion:2 as const,revision:0,dependencyRevision:0,reconciliations:Object.freeze([]),recoveries:Object.freeze([]),recoveryFence:null,lifecycle:ExecutionLifecycle.create(workflowRunLifecycle,input.runId).snapshot(),engineOwner:null,steps:Object.freeze([]),attempts:Object.freeze([]),accepted:Object.freeze([]),transitions:Object.freeze([]),transitionPlan:null,completionDecision:null,outcome:null});
  }
  static async restore(snapshot:WorkflowRunSnapshot):Promise<WorkflowRun>{const run=new WorkflowRun(snapshot,await ExecutionLifecycle.restore(workflowRunLifecycle,snapshot.lifecycle));for(const state of snapshot.steps)run.steps.set(state.stepRunId,await StepRun.restore(state));run.audit();return run;}
  snapshot():WorkflowRunSnapshot{return Object.freeze({...this.state,lifecycle:this.lifecycle.snapshot(),steps:Object.freeze([...this.steps.values()].map(step=>step.snapshot()))});}
  acquire(commandId:string,ownerToken:string):boolean{if(this.state.outcome!==null||
        this.state.engineOwner!==null)return false;if(this.lifecycle.snapshot().status!=="active")this.lifecycle.transition("active");this.state=Object.freeze({...this.state,engineOwner:Object.freeze({commandId,ownerToken})});this.bump();return true;}
  current(view:StepInputPolicyInput):boolean{const step=this.state.definition.steps.find(item=>item.id===view.stepId);return step!==undefined&&same(view)===same(this.view(step.id));}
  view(stepId:string):StepInputPolicyInput{const step=this.definitionStep(stepId);return Object.freeze({workflow:Object.freeze({id:this.state.definition.id,version:this.state.definition.version}),stepId,viewRef:"workflow-view:"+this.state.runId+":"+this.state.dependencyRevision,request:this.state.request,dependencies:Object.freeze(step.dependencies.map(id=>this.state.accepted.find(item=>item.stepId===id)).filter((item):item is NonNullable<typeof item>=>item!==undefined))});}
  ready():StepDefinition|null{return this.state.definition.steps.find(step=>!this.state.accepted.some(item=>item.stepId===step.id)&&step.dependencies.every(id=>this.state.accepted.some(item=>item.stepId===id))&&!this.activeStep(step.id)?.snapshot().attemptId)??null;}
  openStep(owner:string,stepId:string,stepRunId:string):string|null{this.owner(owner);const step=this.definitionStep(stepId);if(this.ready()?.id!==stepId)throw new WorkflowRunError();if(this.state.attempts.length>=this.state.definition.maxTotalAttempts||
        this.state.attempts.filter(item=>item.claim.step.id===stepId).length>=step.maxAttempts)return null;const old=this.activeStep(stepId);if(old!==null)return old.snapshot().stepRunId;if(this.steps.has(stepRunId)||
        !this.id(stepRunId))throw new WorkflowRunError();this.steps.set(stepRunId,StepRun.create(stepId,stepRunId));this.bump();return stepRunId;}
  claim(owner:string,command:StepAttemptClaim):StepAttemptClaimOutcome{
    this.owner(owner);const old=this.state.attempts.find(item=>item.claim.commandId===command.commandId);
    if(old!==undefined){if(this.commandKey(old.claim)!==this.commandKey(command))throw new WorkflowRunError();return {status:"existing",outcome:old.receipt===null?{status:"pending",attemptId:old.claim.attemptId,pendingOperationRefs:[old.claim.operationId]}:{status:"recorded",receipt:old.receipt}};}
    if(this.state.transitionPlan!==null||
        this.lifecycle.snapshot().pendingOperationRefs.length>0||
        this.state.attempts.some(item=>item.receipt===null))return {status:"blocked",code:"WORKFLOW_OPERATION_PENDING"};
    const step=this.definitionStep(command.step.id),execution=this.activeStep(step.id);
    if(command.runId!==this.state.runId||
        same(command.scope)!==same(this.state.scope)||
        same(command.workflow)!==same({id:this.state.definition.id,version:this.state.definition.version})||
        same(command.step)!==same(step)||
        command.maxRunAttempts!==this.state.definition.maxTotalAttempts||
        !this.current(command.view)||
        execution===null||
        execution.snapshot().stepRunId!==command.stepRunId||
        execution.snapshot().attemptId!==null)throw new WorkflowRunError();
    if(this.state.accepted.some(item=>item.stepId===step.id)||
        step.dependencies.some(id=>!this.state.accepted.some(item=>item.stepId===id)))return {status:"blocked",code:"STEP_NOT_READY"};
    const attemptNumber=this.state.attempts.filter(item=>item.claim.step.id===step.id).length+1;if(attemptNumber>step.maxAttempts||
        this.state.attempts.length>=this.state.definition.maxTotalAttempts)return {status:"blocked",code:"WORKFLOW_ATTEMPT_LIMIT"};
    if([command.commandId,command.ownerToken,command.attemptId,command.operationId].some(value=>!this.id(value))||
        new Set([command.commandId,command.ownerToken,command.attemptId,command.operationId]).size!==4||
        this.state.attempts.some(item=>[item.claim.attemptId,item.claim.operationId,item.claim.ownerToken,item.claim.commandId].some(id=>[command.commandId,command.ownerToken,command.attemptId,command.operationId].includes(id))))throw new WorkflowRunError();
    execution.start(command.attemptId);this.state=Object.freeze({...this.state,attempts:Object.freeze([...this.state.attempts,Object.freeze({claim:command,attemptNumber,stage:"claimed" as const,input:null,outcome:null,receipt:null})])});this.bump();return {status:"admitted",attemptNumber};
  }
  prepare(owner:string,attemptId:string,token:string,input:JsonValue):void{const attempt=this.ownedAttempt(owner,attemptId,token);if(attempt.stage!=="claimed")throw new WorkflowRunError();this.replace({...attempt,input,stage:"prepared"});}
  dispatch(owner:string,attemptId:string,token:string):boolean{const attempt=this.ownedAttempt(owner,attemptId,token);if(attempt.stage!=="prepared")return false;this.lifecycle.recordPendingOperation(attempt.claim.operationId);this.steps.get(attempt.claim.stepRunId)!.pending(attempt.claim.operationId);this.replace({...attempt,stage:"dispatching"});return true;}
  record(owner:string,attemptId:string,token:string,outcome:ExecutionOutcome<JsonValue>):void{
    const attempt=this.ownedAttempt(owner,attemptId,token,true);if(attempt.outcome!==null){if(same(attempt.outcome)!==same(outcome))throw new WorkflowRunError();return;}
    if(attempt.stage!=="dispatching"&&outcome.status==="completed")throw new WorkflowRunError();const step=this.steps.get(attempt.claim.stepRunId)!;
    if(attempt.stage==="dispatching"){this.lifecycle.recordReconciledOperation(attempt.claim.operationId);step.reconciled(attempt.claim.operationId);}
    if(outcome.status!=="completed")for(const ref of outcome.pendingOperationRefs){this.lifecycle.retainPendingOperation(ref);step.retain(ref);}
    this.replace({...attempt,outcome,stage:"outcome"});
  }
  commit(owner:string,attemptId:string,token:string,acceptance:StepResultAcceptance,context:IExecutionContext,now:number):StepAttemptReceipt{
    const attempt=this.ownedAttempt(owner,attemptId,token,true);if(attempt.receipt!==null)return attempt.receipt;if(attempt.outcome===null)throw new WorkflowRunError();
    if(context.identity.runId!==this.state.runId||
        context.identity.stepRunId!==attempt.claim.stepRunId||
        context.identity.operationId!==attempt.claim.operationId||
        same(context.scope)!==same(this.state.scope))throw new WorkflowRunError();
    let decision=acceptance;if(decision.status==="accepted"&&(this.lifecycle.snapshot().cancellationRequested||context.signal.aborted||
        (context.deadlineEpochMs!==null&&now>=context.deadlineEpochMs)||
        (this.state.deadlineEpochMs!==null&&now>=this.state.deadlineEpochMs)||
        !this.current(attempt.claim.view)||
        this.lifecycle.snapshot().pendingOperationRefs.length>0))decision={status:"not-evaluated",code:"COMMIT_PRECONDITION_CHANGED",message:"Candidate retained; controls, dependencies, or pending effects prevent acceptance."};
    if(attempt.outcome.status!=="completed"&&decision.status!=="not-evaluated")throw new WorkflowRunError();
    const receipt:StepAttemptReceipt=Object.freeze({attemptId,stepRunId:attempt.claim.stepRunId,runId:this.state.runId,stepId:attempt.claim.step.id,attemptNumber:attempt.attemptNumber,workflow:attempt.claim.workflow,executor:attempt.claim.step.executor,viewRef:attempt.claim.view.viewRef,receiptRef:"step-receipt:"+attemptId,outcome:attempt.outcome,acceptance:decision});
    this.steps.get(attempt.claim.stepRunId)!.close(receipt);this.replace({...attempt,receipt,stage:"committed"});
    if(decision.status==="accepted"&&attempt.outcome.status==="completed"){this.state=Object.freeze({...this.state,accepted:Object.freeze([...this.state.accepted,Object.freeze({stepId:receipt.stepId,attemptId,receiptRef:receipt.receiptRef,result:attempt.outcome.result})]),dependencyRevision:this.state.dependencyRevision+1});this.bump();}return receipt;
  }
  unprocessed():StepAttemptReceipt|null{return this.state.attempts.find(attempt=>attempt.receipt!==null&&!this.state.transitions.some(record=>record.triggerAttemptId===attempt.claim.attemptId))?.receipt??null;}
  consume(owner:string,revision:number,triggerAttemptId:string):void{this.owner(owner);this.expected(revision);if(this.unprocessed()?.attemptId!==triggerAttemptId)throw new WorkflowRunError();this.state=Object.freeze({...this.state,transitions:Object.freeze([...this.state.transitions,Object.freeze({triggerAttemptId,transitionId:null,fixOperationId:null})])});this.bump();}
  stageCorrection(owner:string,revision:number,triggerAttemptId:string,transitionId:string,operationId:string):WorkflowTransitionPlan|null{
    this.owner(owner);this.expected(revision);const trigger=this.unprocessed(),transition=this.state.definition.transitions.find(item=>item.id===transitionId);
    if(trigger?.attemptId!==triggerAttemptId||
        transition===undefined||
        transition.fromStepId!==trigger.stepId||
        !this.affected(transition.toStepId).includes(trigger.stepId)||
        !this.state.attempts.some(item=>item.claim.step.id===transition.toStepId)||
        this.state.transitionPlan!==null||
        this.lifecycle.snapshot().pendingOperationRefs.length>0||
        !this.id(operationId))throw new WorkflowRunError();
    const affected=this.affected(transition.toStepId);if(this.state.transitions.filter(item=>item.transitionId===transitionId).length>=transition.maxTraversals||
        affected.some(id=>this.state.attempts.filter(attempt=>attempt.claim.step.id===id).length>=this.definitionStep(id).maxAttempts)||
        this.state.attempts.length+affected.length>this.state.definition.maxTotalAttempts)return null;
    const plan=Object.freeze({triggerAttemptId,transitionId,operationId});this.state=Object.freeze({...this.state,transitionPlan:plan});this.lifecycle.recordPendingOperation(operationId);this.bump();return plan;
  }
  applyCorrection(owner:string,plan:WorkflowTransitionPlan):void{
    this.owner(owner);if(same(this.state.transitionPlan)!==same(plan))throw new WorkflowRunError();const transition=this.state.definition.transitions.find(item=>item.id===plan.transitionId)!;const affected=this.affected(transition.toStepId);
    for(const step of this.steps.values())if(affected.includes(step.snapshot().stepId)&&!step.snapshot().invalidated)step.invalidate();
    this.lifecycle.recordReconciledOperation(plan.operationId);this.state=Object.freeze({...this.state,transitionPlan:null,accepted:Object.freeze(this.state.accepted.filter(item=>!affected.includes(item.stepId))),dependencyRevision:this.state.dependencyRevision+1,transitions:Object.freeze([...this.state.transitions,Object.freeze({triggerAttemptId:plan.triggerAttemptId,transitionId:plan.transitionId,fixOperationId:plan.operationId})])});this.bump();
  }
  denyCorrection(owner:string,plan:WorkflowTransitionPlan):void{this.owner(owner);if(same(this.state.transitionPlan)!==same(plan))throw new WorkflowRunError();this.lifecycle.recordReconciledOperation(plan.operationId);this.state=Object.freeze({...this.state,transitionPlan:null});this.bump();}
  complete(owner:string,revision:number):void{this.owner(owner);this.expected(revision);if(this.state.accepted.length!==this.state.definition.steps.length||
        this.unprocessed()!==null||
        this.lifecycle.snapshot().pendingOperationRefs.length>0)throw new WorkflowRunError();const result=Object.freeze({runId:this.state.runId,results:this.state.accepted});this.lifecycle.transition("completed",{acceptedResultRef:"workflow-result:"+this.state.runId});this.state=Object.freeze({...this.state,completionDecision:Object.freeze({accepted:true as const}),outcome:Object.freeze({status:"completed" as const,result})});this.bump();}
  stop(owner:string,reason:ExecutionStopReason):void{this.owner(owner);if(this.lifecycle.snapshot().pendingOperationRefs.length>0){if(reason.code==="cancelled")this.lifecycle.requestCancellation();else this.lifecycle.transition("interrupted");this.bump();return;}if(reason.code==="cancelled"){this.lifecycle.requestCancellation();this.lifecycle.transition("cancelled");}else this.lifecycle.transition("stopped");this.state=Object.freeze({...this.state,outcome:Object.freeze({status:"stopped" as const,reason,partial:collectWorkflowPartial(this.snapshot()),pendingOperationRefs:Object.freeze([])})});this.bump();}
  rejectCompletion(owner:string,revision:number,decision:Extract<import("./WorkflowCompletionDecision.js").WorkflowCompletionDecision,{accepted:false}>,control:ExecutionStopReason|null=null):void{this.owner(owner);this.expected(revision);this.state=Object.freeze({...this.state,completionDecision:decision});this.stop(owner,control??{code:"no-progress",message:decision.message});}
  fail(owner:string):void{this.owner(owner);if(this.lifecycle.snapshot().pendingOperationRefs.length>0)throw new WorkflowRunError();this.lifecycle.transition("failed");this.state=Object.freeze({...this.state,outcome:Object.freeze({status:"failed" as const,error:Object.freeze({code:"WORKFLOW_STEP_FAILED",message:"A step failed and no declared correction can advance it."}),partial:collectWorkflowPartial(this.snapshot()),pendingOperationRefs:Object.freeze([])})});this.bump();}
  interrupt(owner:string):void{this.owner(owner);this.lifecycle.transition("interrupted");this.bump();}

  requestDurableCancellation():void{if(this.state.outcome!==null)return;if(!this.lifecycle.snapshot().cancellationRequested)this.lifecycle.requestCancellation();for(const step of this.steps.values())if(!step.snapshot().invalidated)step.requestCancellation();this.bump();}
  fenceRecovery(revision:number,previousOwner:string|null,ownerToken:string,proofRef:string):void{
    this.expected(revision);if(this.state.outcome!==null||this.state.engineOwner?.ownerToken!==previousOwner&&!(this.state.engineOwner===null&&previousOwner===null)||!this.id(ownerToken)||typeof proofRef!=="string"||!proofRef||proofRef.length>256)throw new WorkflowRunError();
    if(this.lifecycle.snapshot().status==="created")this.lifecycle.transition("active");if(this.lifecycle.snapshot().status==="active")this.lifecycle.transition("interrupted");if(this.lifecycle.snapshot().status!=="recovering")this.lifecycle.transition("recovering");
    for(const step of this.steps.values())if(!step.snapshot().invalidated)step.enterRecovery();
    this.state=Object.freeze({...this.state,engineOwner:Object.freeze({commandId:ownerToken,ownerToken}),recoveryFence:Object.freeze({ownerToken,proofRef})});this.bump();
  }
  recoveryCheckpoint(owner:string,revision:number,reference:string):void{this.recoveryOwner(owner);this.expected(revision);this.lifecycle.attachCheckpoint(reference);this.bump();}
  recoverKnownOutcome(owner:string,attemptId:string,outcome:ExecutionOutcome<JsonValue>):void{
    this.recoveryOwner(owner);const attempt=this.state.attempts.find(item=>item.claim.attemptId===attemptId);if(attempt===undefined||attempt.stage!=="dispatching"||attempt.outcome!==null)throw new WorkflowRunError();const step=this.steps.get(attempt.claim.stepRunId)!;
    this.lifecycle.recordReconciledOperation(attempt.claim.operationId);step.reconciled(attempt.claim.operationId);
    if(outcome.status!=="completed")for(const ref of outcome.pendingOperationRefs){this.lifecycle.retainPendingOperation(ref);step.retain(ref);}
    this.replace({...attempt,outcome,stage:"outcome"});
  }
  acknowledgeEffect(owner:string,operationRef:string,receiptRef:string):void{
    this.recoveryOwner(owner);const old=this.state.reconciliations.find(record=>record.operationRef===operationRef);if(old!==undefined){if(old.receiptRef!==receiptRef)throw new WorkflowRunError();return;}
    if(!this.lifecycle.snapshot().pendingOperationRefs.includes(operationRef)||this.state.transitionPlan?.operationId===operationRef||this.state.attempts.some(attempt=>attempt.stage==="dispatching"&&attempt.claim.operationId===operationRef)||!receiptRef||receiptRef.length>256)throw new WorkflowRunError();
    this.lifecycle.recordReconciledOperation(operationRef);for(const step of this.steps.values())if(step.snapshot().lifecycle.pendingOperationRefs.includes(operationRef))step.reconciled(operationRef);
    this.state=Object.freeze({...this.state,reconciliations:Object.freeze([...this.state.reconciliations,Object.freeze({operationRef,receiptRef})])});this.bump();
  }
  recoverCorrection(owner:string,apply:boolean):void{
    this.recoveryOwner(owner);const plan=this.state.transitionPlan;if(plan===null)return;this.lifecycle.recordReconciledOperation(plan.operationId);
    if(apply){const transition=this.state.definition.transitions.find(item=>item.id===plan.transitionId)!;const affected=this.affected(transition.toStepId);for(const step of this.steps.values())if(!step.snapshot().invalidated&&affected.includes(step.snapshot().stepId))step.invalidate();this.state=Object.freeze({...this.state,accepted:Object.freeze(this.state.accepted.filter(item=>!affected.includes(item.stepId))),dependencyRevision:this.state.dependencyRevision+1,transitions:Object.freeze([...this.state.transitions,Object.freeze({triggerAttemptId:plan.triggerAttemptId,transitionId:plan.transitionId,fixOperationId:plan.operationId})])});}
    this.state=Object.freeze({...this.state,transitionPlan:null});this.bump();
  }
  finishRecovery(owner:string,commandId:string,resume:boolean,reason:ExecutionStopReason|null):WorkflowRecoveryRecord{
    this.recoveryOwner(owner);const old=this.state.recoveries.find(record=>record.commandId===commandId);if(old!==undefined)return old;
    if(this.lifecycle.snapshot().pendingOperationRefs.length>0||this.state.transitionPlan!==null||this.state.attempts.some(attempt=>attempt.stage==="dispatching"))throw new WorkflowRunError();
    if(resume&&(this.lifecycle.snapshot().cancellationRequested||reason!==null))throw new WorkflowRunError();
    if(!resume){const stop=reason??{code:"no-progress" as const,message:"Recovery retained collected work without resuming."};for(const attempt of [...this.state.attempts])if(attempt.receipt===null){const outcome=attempt.outcome??{status:"stopped" as const,reason:stop,partial:{summary:"Executor did not dispatch; prepared work is retained.",evidenceRefs:[],artifactRefs:[],unresolved:["Assignment remains incomplete."]},pendingOperationRefs:[]};const receipt:StepAttemptReceipt=Object.freeze({attemptId:attempt.claim.attemptId,stepRunId:attempt.claim.stepRunId,runId:this.state.runId,stepId:attempt.claim.step.id,attemptNumber:attempt.attemptNumber,workflow:attempt.claim.workflow,executor:attempt.claim.step.executor,viewRef:attempt.claim.view.viewRef,receiptRef:"step-receipt:"+attempt.claim.attemptId,outcome,acceptance:{status:"not-evaluated" as const,code:"RECOVERY_STOPPED",message:"Recovered work retained without acceptance."}});this.replace({...attempt,outcome,receipt,stage:"committed"});}}
    for(const step of this.steps.values())if(!step.snapshot().invalidated){const attempt=this.state.attempts.find(item=>item.claim.attemptId===step.snapshot().attemptId);step.readyAfterRecovery(attempt?.receipt??null,!resume);}
    if(resume){this.lifecycle.transition("active");this.state=Object.freeze({...this.state,engineOwner:null});}
    else{const stop=reason??{code:"no-progress" as const,message:"Recovery retained collected work without resuming."};if(this.lifecycle.snapshot().cancellationRequested){this.lifecycle.transition("stopping");this.lifecycle.transition("cancelled");}else this.lifecycle.transition("stopped");this.state=Object.freeze({...this.state,outcome:Object.freeze({status:"stopped" as const,reason:this.lifecycle.snapshot().cancellationRequested?{code:"cancelled" as const,message:"Cancellation confirmed after quiescence and reconciliation."}:stop,partial:collectWorkflowPartial(this.snapshot()),pendingOperationRefs:Object.freeze([])})});}
    const record:WorkflowRecoveryRecord=Object.freeze({commandId,receiptRef:"workflow-recovery:"+commandId,proofRef:this.state.recoveryFence!.proofRef,action:resume?"resumed":"stopped",revision:this.state.revision+1});this.state=Object.freeze({...this.state,recoveryFence:null,recoveries:Object.freeze([...this.state.recoveries,record])});this.bump();return record;
  }
  private recoveryOwner(owner:string):void{if(this.state.engineOwner?.ownerToken!==owner||this.state.recoveryFence?.ownerToken!==owner||this.lifecycle.snapshot().status!=="recovering")throw new WorkflowRunError();}

  private owner(token:string):void{if(this.state.engineOwner?.ownerToken!==token||this.lifecycle.snapshot().status!=="active")throw new WorkflowRunError();}
  private expected(revision:number):void{if(this.state.revision!==revision)throw new WorkflowRunError();}
  private activeStep(stepId:string):StepRun|null{return [...this.steps.values()].find(step=>step.snapshot().stepId===stepId&&!step.snapshot().invalidated)??null;}
  private definitionStep(stepId:string):StepDefinition{const step=this.state.definition.steps.find(item=>item.id===stepId);if(step===undefined)throw new WorkflowRunError();return step;}
  private ownedAttempt(owner:string,attemptId:string,token:string,recording=false):WorkflowStepAttempt{if(recording){if(this.state.engineOwner?.ownerToken!==owner||!["active","stopping"].includes(this.lifecycle.snapshot().status))throw new WorkflowRunError();}else this.owner(owner);const attempt=this.state.attempts.find(item=>item.claim.attemptId===attemptId);if(attempt===undefined||
        attempt.claim.ownerToken!==token)throw new WorkflowRunError();return attempt;}
  private replace(attempt:WorkflowStepAttempt):void{this.state=Object.freeze({...this.state,attempts:Object.freeze(this.state.attempts.map(item=>item.claim.attemptId===attempt.claim.attemptId?Object.freeze(attempt):item))});this.bump();}
  private affected(stepId:string):readonly string[]{const selected=new Set([stepId]);let changed=true;while(changed){changed=false;for(const step of this.state.definition.steps)if(!selected.has(step.id)&&step.dependencies.some(id=>selected.has(id))){selected.add(step.id);changed=true;}}return [...selected];}
  private commandKey(claim:StepAttemptClaim):string{return same({runId:claim.runId,scope:claim.scope,workflow:claim.workflow,step:claim.step,view:claim.view,stepRunId:claim.stepRunId,maxRunAttempts:claim.maxRunAttempts});}
  private id(value:unknown):boolean{return typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(value);}
  private bump():void{if(!Number.isSafeInteger(this.state.revision+1)||
        !Number.isSafeInteger(this.state.dependencyRevision))throw new WorkflowRunError();this.state=Object.freeze({...this.state,revision:this.state.revision+1});}
  private audit():void{
    if(this.state.lifecycle.executionId!==this.state.runId||
        new Set(this.state.steps.map(step=>step.stepRunId)).size!==this.state.steps.length||
        new Set(this.state.attempts.map(item=>item.claim.attemptId)).size!==this.state.attempts.length||
        new Set(this.state.accepted.map(item=>item.stepId)).size!==this.state.accepted.length)throw new WorkflowRunError();
    for(const step of this.state.definition.steps){if(this.state.steps.filter(item=>item.stepId===step.id&&!item.invalidated).length>1||
        this.state.attempts.filter(item=>item.claim.step.id===step.id).length>step.maxAttempts)throw new WorkflowRunError();}
    for(const attempt of this.state.attempts){const step=this.steps.get(attempt.claim.stepRunId)?.snapshot();if(step===undefined||
        step.stepId!==attempt.claim.step.id||
        step.attemptId!==attempt.claim.attemptId)throw new WorkflowRunError();if(attempt.receipt!==null&&(attempt.receipt.attemptId!==attempt.claim.attemptId||
        same(attempt.receipt.outcome)!==same(attempt.outcome)))throw new WorkflowRunError();}
    for(const accepted of this.state.accepted){const attempt=this.state.attempts.find(item=>item.claim.attemptId===accepted.attemptId);if(attempt?.receipt?.acceptance.status!=="accepted"||
        attempt.outcome?.status!=="completed"||
        accepted.stepId!==attempt.claim.step.id||
        accepted.receiptRef!==attempt.receipt.receiptRef||
        same(accepted.result)!==same(attempt.outcome.result)||
        this.steps.get(attempt.claim.stepRunId)!.snapshot().invalidated)throw new WorkflowRunError();}

    const identityIds:string[]=[];const expectedPending=new Set<string>();
    for(let index=0;index<this.state.attempts.length;index++){
      const attempt=this.state.attempts[index],claim=attempt.claim,execution=this.steps.get(claim.stepRunId)!.snapshot();
      const count=this.state.attempts.slice(0,index+1).filter(item=>item.claim.step.id===claim.step.id).length;if(attempt.attemptNumber!==count)throw new WorkflowRunError();
      for(const id of [claim.commandId,claim.ownerToken,claim.attemptId,claim.operationId]){if(identityIds.includes(id))throw new WorkflowRunError();identityIds.push(id);}
      if(claim.view.dependencies.length!==claim.step.dependencies.length||
        claim.view.dependencies.some(dependency=>!claim.step.dependencies.includes(dependency.stepId)))throw new WorkflowRunError();
      for(const dependency of claim.view.dependencies){const prior=this.state.attempts.slice(0,index).find(item=>item.claim.attemptId===dependency.attemptId);if(prior?.receipt?.acceptance.status!=="accepted"||
        prior.outcome?.status!=="completed"||
        prior.claim.step.id!==dependency.stepId||
        prior.receipt.receiptRef!==dependency.receiptRef||
        same(prior.outcome.result)!==same(dependency.result))throw new WorkflowRunError();}
      const pending=(attempt.stage==="dispatching"?[claim.operationId]:attempt.outcome!==null&&attempt.outcome.status!=="completed"?attempt.outcome.pendingOperationRefs:[]).filter(ref=>!this.state.reconciliations.some(record=>record.operationRef===ref));
      for(const ref of pending)expectedPending.add(ref);if(same([...pending].sort())!==same([...execution.lifecycle.pendingOperationRefs].sort()))throw new WorkflowRunError();
      if(attempt.receipt!==null&&(attempt.receipt.runId!==this.state.runId||
        attempt.receipt.stepRunId!==claim.stepRunId||
        attempt.receipt.stepId!==claim.step.id||
        attempt.receipt.attemptNumber!==attempt.attemptNumber||
        same(attempt.receipt.workflow)!==same(claim.workflow)||
        same(attempt.receipt.executor)!==same(claim.step.executor)||
        attempt.receipt.viewRef!==claim.view.viewRef))throw new WorkflowRunError();
      if(attempt.receipt?.acceptance.status==="accepted"&&!execution.invalidated&&!this.state.accepted.some(result=>result.attemptId===claim.attemptId))throw new WorkflowRunError();
      if(attempt.receipt?.acceptance.status==="accepted"&&(execution.lifecycle.status!=="completed"||
        execution.lifecycle.evidence.acceptedResultRef!==attempt.receipt.receiptRef))throw new WorkflowRunError();
    }
    for(const execution of this.state.steps)if(execution.attemptId===null&&!["created","stopped","cancelled"].includes(execution.lifecycle.status)||
        execution.attemptId!==null&&!this.state.attempts.some(attempt=>attempt.claim.attemptId===execution.attemptId&&attempt.claim.stepRunId===execution.stepRunId))throw new WorkflowRunError();
    for(const record of this.state.transitions){const trigger=this.state.attempts.find(attempt=>attempt.claim.attemptId===record.triggerAttemptId)?.receipt;if(trigger===undefined||
        trigger===null)throw new WorkflowRunError();if(record.transitionId!==null){const transition=this.state.definition.transitions.find(item=>item.id===record.transitionId);if(transition===undefined||
        transition.fromStepId!==trigger.stepId||
        !this.affected(transition.toStepId).includes(trigger.stepId))throw new WorkflowRunError();}}
    if(this.state.transitionPlan!==null){expectedPending.add(this.state.transitionPlan.operationId);if(this.unprocessed()?.attemptId!==this.state.transitionPlan.triggerAttemptId)throw new WorkflowRunError();}
    if(same([...expectedPending].sort())!==same([...this.lifecycle.snapshot().pendingOperationRefs].sort()))throw new WorkflowRunError();
    if(new Set(this.state.reconciliations.map(record=>record.operationRef)).size!==this.state.reconciliations.length||new Set(this.state.recoveries.map(record=>record.commandId)).size!==this.state.recoveries.length)throw new WorkflowRunError();
    if(this.state.recoveryFence!==null&&(this.state.recoveryFence.ownerToken!==this.state.engineOwner?.ownerToken||!["recovering","stopping"].includes(this.lifecycle.snapshot().status)))throw new WorkflowRunError();
    const status=this.lifecycle.snapshot().status;
    if(this.state.engineOwner===null&&!(status==="active"&&this.state.recoveries.some(record=>record.action==="resumed"))&&(!(status==="created"||(status==="stopping"&&this.lifecycle.snapshot().cancellationRequested))||
        this.state.attempts.length!==0||
        this.state.steps.length!==0||
        this.state.accepted.length!==0||
        this.state.transitions.length!==0||
        this.state.transitionPlan!==null))throw new WorkflowRunError();
    if(this.state.outcome===null&&["completed","failed","stopped","cancelled"].includes(status)||
        this.state.outcome?.status==="completed"&&(status!=="completed"||
        this.state.completionDecision?.accepted!==true||
        this.unprocessed()!==null)||
        this.state.outcome?.status==="failed"&&status!=="failed"||
        this.state.outcome?.status==="stopped"&&!["stopped","cancelled"].includes(status))throw new WorkflowRunError();
    if(this.state.outcome?.status==="stopped"&&((status==="cancelled")!==(this.state.outcome.reason.code==="cancelled")))throw new WorkflowRunError();
    if(this.state.outcome?.status==="completed"&&(this.state.accepted.length!==this.state.definition.steps.length||
        same(this.state.outcome.result)!==same({runId:this.state.runId,results:this.state.accepted})))throw new WorkflowRunError();
  }
}
