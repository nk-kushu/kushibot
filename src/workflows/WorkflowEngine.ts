import type { IWorkflowRunStore } from "./IWorkflowRunStore.js";
import type { IWorkflowStepRunnerFactory } from "./IWorkflowStepRunnerFactory.js";
import type { WorkflowEngineOutcome } from "./WorkflowEngineOutcome.js";
import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot.js";
import type { StepContextEvidenceInput } from "./StepContextEvidenceInput.js";
import type { IPolicy } from "../contracts/IPolicy.js";
import type { IUsageLedgerStore } from "../usage/IUsageLedgerStore.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
import { WorkflowRun } from "./WorkflowRun.js";
import { WorkflowPolicyRegistry } from "./WorkflowPolicyRegistry.js";
import { WorkflowStepAttemptJournal } from "./WorkflowStepAttemptJournal.js";
import { WorkflowStepContextVerifier } from "./WorkflowStepContextVerifier.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { zeroUsage } from "../usage/zeroUsage.js";
import { collectWorkflowPartial } from "./collectWorkflowPartial.js";
import { canonicalWorkflowValue as same } from "./canonicalWorkflowValue.js";
import { WorkflowRunError } from "../errors/WorkflowRunError.js";
export class WorkflowEngine{
 constructor(private readonly store:IWorkflowRunStore,
    private readonly runners:IWorkflowStepRunnerFactory,
    private readonly policies:WorkflowPolicyRegistry,
    private readonly evidence:IPolicy<StepContextEvidenceInput,boolean>,
    private readonly ledger:IUsageLedgerStore,
    private readonly ids:IIdGenerator,
    private readonly clock:IClock,
    private readonly json:JsonValueContract){}
 async run(rawContext:IExecutionContext):Promise<WorkflowEngineOutcome>{
  let snapshot=await this.store.read();
  if(rawContext.identity.runId!==snapshot.runId||
        rawContext.identity.stepRunId!==undefined||
        rawContext.identity.sessionId!==undefined||
        same(rawContext.scope)!==same(snapshot.scope)||
        !/^[A-Za-z0-9_.:-]{1,128}$/.test(rawContext.identity.operationId))throw new WorkflowRunError();
  this.policies.completion(snapshot.completionPolicy);for(const transition of snapshot.definition.transitions){this.policies.transition(transition.policy);const ancestors=new Set([transition.fromStepId]);let changed=true;while(changed){changed=false;for(const step of snapshot.definition.steps)if(ancestors.has(step.id))for(const dependency of step.dependencies)if(!ancestors.has(dependency)){ancestors.add(dependency);changed=true;}}if(!ancestors.has(transition.toStepId))throw new WorkflowRunError();}
  const deadlines=[snapshot.deadlineEpochMs,rawContext.deadlineEpochMs].filter((value):value is number=>value!==null);
  const context:IExecutionContext=Object.freeze({...rawContext,identity:Object.freeze({...rawContext.identity}),scope:snapshot.scope,deadlineEpochMs:deadlines.length===0?null:Math.min(...deadlines)});
  if(snapshot.outcome!==null||snapshot.lifecycle.cancellationRequested)return this.present(snapshot);
  const owner=this.ids.nextId();if(!/^[A-Za-z0-9_.:-]{1,128}$/.test(owner)||owner===context.identity.operationId)throw new WorkflowRunError();
  if(!await this.store.mutate(run=>run.acquire(context.identity.operationId,owner)))return this.present(await this.store.read());
  const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);
  const runner=this.runners.create(new WorkflowStepAttemptJournal(this.store,owner,this.clock),new WorkflowStepContextVerifier(this.store,this.evidence));
  for(let boundary=0;boundary<snapshot.definition.maxTotalAttempts*3+8;boundary++){
   snapshot=await this.store.read();if(snapshot.lifecycle.cancellationRequested)return this.present(snapshot);const stop=guard.check();if(stop!==null)return this.stop(owner,stop);
   if(snapshot.lifecycle.pendingOperationRefs.length>0){await this.store.mutate(run=>run.interrupt(owner));return this.present(await this.store.read());}
   const aggregate=await WorkflowRun.restore(snapshot);
   const unfinished=snapshot.attempts.find(attempt=>attempt.receipt===null);
   if(unfinished!==undefined){const execution:IExecutionContext=Object.freeze({...context,identity:Object.freeze({...context.identity,operationId:unfinished.claim.operationId,stepRunId:unfinished.claim.stepRunId,parentOperationId:unfinished.claim.commandId})});const result=await runner.resume(unfinished,execution);if(result.status==="pending"){await this.store.mutate(run=>run.interrupt(owner));return this.present(await this.store.read());}if(result.status==="blocked")return this.stop(owner,{code:"no-progress",message:"Recovered attempt could not advance."});continue;}
   const trigger=aggregate.unprocessed();
   if(trigger!==null){
    let chosen:string|null=null;
    for(const transition of snapshot.definition.transitions.filter(item=>item.fromStepId===trigger.stepId)){
     const decision=await this.json.validate(await this.policies.transition(transition.policy).apply(Object.freeze({run:snapshot,trigger,execution:context})));
     if(!decision.valid||
        decision.value===null||
        typeof decision.value!=="object"||
        Array.isArray(decision.value)||
        Object.keys(decision.value).length!==1||
        typeof (decision.value as Record<string,unknown>).take!=="boolean")throw new WorkflowRunError();
     if((decision.value as Record<string,unknown>).take===true){chosen=transition.id;break;}
    }
    const afterPolicy=guard.check();if(afterPolicy!==null)return this.stop(owner,afterPolicy);
    if(chosen===null){await this.store.mutate(run=>run.consume(owner,snapshot.revision,trigger.attemptId));continue;}
    const transitionId=chosen,fixId=this.ids.nextId();
    const plan=await this.store.mutate(run=>run.stageCorrection(owner,snapshot.revision,trigger.attemptId,transitionId,fixId));
    if(plan===null)return this.stop(owner,{code:"limit-reached",message:"Correction traversal or remaining attempt allowance is exhausted."});
    const admitted=await this.ledger.mutate(ledger=>{const reservation=ledger.reserve(plan.operationId,snapshot.budgetScopeId,{...zeroUsage,fixes:1});if(reservation.admitted&&!reservation.replayed)ledger.settle(plan.operationId,{...zeroUsage,fixes:1});return reservation;});
    if(!admitted.admitted){await this.store.mutate(run=>run.denyCorrection(owner,plan));return this.stop(owner,{code:"limit-reached",message:"Shared correction allowance is exhausted."});}
    if(admitted.replayed){await this.store.mutate(run=>run.interrupt(owner));return this.present(await this.store.read());}
    const afterBudget=guard.check();if(afterBudget!==null)return this.stop(owner,afterBudget);
    await this.store.mutate(run=>run.applyCorrection(owner,plan));continue;
   }
   if(snapshot.accepted.length===snapshot.definition.steps.length){
    const checked=await this.json.validate(await this.policies.completion(snapshot.completionPolicy).apply(Object.freeze({run:snapshot,execution:context})));
    if(!checked.valid||
        checked.value===null||
        typeof checked.value!=="object"||
        Array.isArray(checked.value))throw new WorkflowRunError();const decision=checked.value as Record<string,unknown>;
    if(decision.accepted===true&&Object.keys(decision).length===1){const after=guard.check();if(after!==null)return this.stop(owner,after);await this.store.mutate(run=>{const atCommit=guard.check();if(atCommit!==null)run.stop(owner,atCommit);else run.complete(owner,snapshot.revision);});return this.present(await this.store.read());}
    if(decision.accepted!==false||
        Object.keys(decision).length!==3||
        typeof decision.code!=="string"||
        !/^[A-Z0-9_:-]{1,128}$/.test(decision.code)||
        typeof decision.message!=="string"||
        decision.message.length<1||
        decision.message.length>1024)throw new WorkflowRunError();
    await this.store.mutate(run=>run.rejectCompletion(owner,snapshot.revision,{accepted:false,code:decision.code as string,message:decision.message as string},guard.check()));return this.present(await this.store.read());
   }
   const step=aggregate.ready();
   if(step===null){const last=snapshot.attempts[snapshot.attempts.length-1]?.outcome;if(last?.status==="failed"){await this.store.mutate(run=>run.fail(owner));return this.present(await this.store.read());}return this.stop(owner,last?.status==="stopped"?last.reason:{code:"no-progress",message:"No ready step or declared correction can advance the retained results."});}
   const proposedStepRunId=this.ids.nextId();
   const stepRunId=await this.store.mutate(run=>run.openStep(owner,step.id,proposedStepRunId));
   if(stepRunId===null)return this.stop(owner,{code:"limit-reached",message:"Workflow or step attempt allowance is exhausted."});
   const view=(await WorkflowRun.restore(await this.store.read())).view(step.id);
   const execution:IExecutionContext=Object.freeze({...context,identity:Object.freeze({...context.identity,stepRunId,operationId:this.ids.nextId(),parentOperationId:context.identity.operationId})});
   const result=await runner.run({workflow:{id:snapshot.definition.id,version:snapshot.definition.version},stepId:step.id,view},execution);
   if(result.status==="pending"){await this.store.mutate(run=>run.interrupt(owner));return this.present(await this.store.read());}
   if(result.status==="blocked")return this.stop(owner,{code:"no-progress",message:"StepRunner blocked the attempt: "+result.code});
  }
  return this.stop(owner,{code:"no-progress",message:"Workflow orchestration boundary limit reached."});
 }
 private async stop(owner:string,reason:ExecutionStopReason):Promise<WorkflowEngineOutcome>{await this.store.mutate(run=>run.stop(owner,reason));return this.present(await this.store.read());}
 private present(snapshot:WorkflowRunSnapshot):WorkflowEngineOutcome{
  if(snapshot.outcome!==null)return Object.freeze({status:"finished",outcome:snapshot.outcome});
  const pending=[...new Set([...snapshot.lifecycle.pendingOperationRefs,...snapshot.attempts.filter(attempt=>attempt.receipt===null).map(attempt=>attempt.claim.operationId)])];
  return pending.length===0?{status:"busy",runId:snapshot.runId}:{status:"pending",runId:snapshot.runId,partial:collectWorkflowPartial(snapshot),pendingOperationRefs:Object.freeze(pending)};
 }
}
