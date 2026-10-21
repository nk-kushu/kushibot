import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { WorkflowDefinitionContract } from "./WorkflowDefinitionContract.js";
import { StepInputPolicyInputContract } from "./StepInputPolicyInputContract.js";
import { StepAttemptReceiptContract } from "./StepAttemptReceiptContract.js";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract.js";
import { WorkflowRun } from "./WorkflowRun.js";
import { WorkflowRunError } from "../errors/WorkflowRunError.js";
import { canonicalWorkflowValue as same } from "./canonicalWorkflowValue.js";
export class WorkflowRunSnapshotContract implements IResultContract<WorkflowRunSnapshot>{
  readonly id="workflow-run-aggregate";readonly version="2";
  constructor(private readonly json:JsonValueContract,
    private readonly definitions:WorkflowDefinitionContract,
    private readonly views:StepInputPolicyInputContract,
    private readonly receipts:StepAttemptReceiptContract,
    private readonly outcomes:ExecutionOutcomeContract<import("../contracts/persistence/JsonValue.js").JsonValue>){}
  async validate(raw:unknown):Promise<ValidationResult<WorkflowRunSnapshot>>{
    const checked=await this.json.validate(raw);if(!checked.valid)return checked;if(new TextEncoder().encode(JSON.stringify(checked.value)).byteLength>2097152)return this.invalid();const row=checked.value as unknown as Record<string,unknown>;
    if(!this.object(row)||
        !this.keys(row,["schemaVersion","revision","dependencyRevision","runId","scope","definition","request","completionPolicy","budgetScopeId","deadlineEpochMs","lifecycle","engineOwner","steps","attempts","accepted","transitions","transitionPlan","completionDecision","outcome","reconciliations","recoveries","recoveryFence"])||
        row.schemaVersion!==2||
        !this.integer(row.revision)||
        !this.integer(row.dependencyRevision)||
        !this.validId(row.runId)||
        !this.validId(row.budgetScopeId)||
        !this.scope(row.scope)||
        !this.reference(row.completionPolicy)||
        !(row.deadlineEpochMs===null||
        this.integer(row.deadlineEpochMs))||
        !Array.isArray(row.steps)||
        row.steps.length>128||
        !Array.isArray(row.attempts)||
        row.attempts.length>128||
        !Array.isArray(row.accepted)||
        row.accepted.length>64||
        !Array.isArray(row.transitions)||
        row.transitions.length>128)return this.invalid();
    if(new TextEncoder().encode(JSON.stringify(row.request)).byteLength>65536)return this.invalid();
    if(!Array.isArray(row.reconciliations)||row.reconciliations.length>4096||!Array.isArray(row.recoveries)||row.recoveries.length>128)return this.invalid();
    for(const record of row.reconciliations)if(!this.object(record)||!this.keys(record,["operationRef","receiptRef"])||!this.ref(record.operationRef)||!this.ref(record.receiptRef))return this.invalid();
    for(const record of row.recoveries)if(!this.object(record)||!this.keys(record,["commandId","receiptRef","proofRef","action","revision"])||!this.validId(record.commandId)||!this.ref(record.receiptRef)||!this.ref(record.proofRef)||!["resumed","stopped"].includes(record.action as string)||!this.integer(record.revision)||record.revision>(row.revision as number))return this.invalid();
    if(row.recoveryFence!==null&&(!this.object(row.recoveryFence)||!this.keys(row.recoveryFence,["ownerToken","proofRef"])||!this.validId(row.recoveryFence.ownerToken)||!this.ref(row.recoveryFence.proofRef)))return this.invalid();
    const definition=await this.definitions.validate(row.definition);if(!definition.valid||
        row.attempts.length>definition.value.maxTotalAttempts||
        !(row.engineOwner===null||
        (this.object(row.engineOwner)&&this.keys(row.engineOwner,["commandId","ownerToken"])&&this.validId(row.engineOwner.commandId)&&this.validId(row.engineOwner.ownerToken))))return this.invalid();
    for(const step of row.steps)if(!this.object(step)||
        !this.keys(step,["stepId","stepRunId","invalidated","attemptId","lifecycle"])||
        !definition.value.steps.some(item=>item.id===step.stepId)||
        !this.validId(step.stepRunId)||
        typeof step.invalidated!=="boolean"||
        !(step.attemptId===null||
        this.validId(step.attemptId)))return this.invalid();
    for(const attempt of row.attempts){
      if(!this.object(attempt)||
        !this.keys(attempt,["claim","attemptNumber","stage","input","outcome","receipt"])||
        !this.integer(attempt.attemptNumber)||
        attempt.attemptNumber<1||
        attempt.attemptNumber>8||
        !["claimed","prepared","dispatching","outcome","committed"].includes(attempt.stage as string)||
        !this.object(attempt.claim))return this.invalid();
      if(new TextEncoder().encode(JSON.stringify(attempt.input)).byteLength>65536)return this.invalid();
      const claim=attempt.claim;
      if(!this.keys(claim,["commandId","ownerToken","attemptId","operationId","stepRunId","runId","scope","workflow","step","view","maxRunAttempts"])||
        ![claim.commandId,claim.ownerToken,claim.attemptId,claim.operationId,claim.stepRunId].every(value=>this.validId(value))||
        claim.runId!==row.runId||
        same(claim.scope)!==same(row.scope)||
        same(claim.workflow)!==same({id:definition.value.id,version:definition.value.version})||
        claim.maxRunAttempts!==definition.value.maxTotalAttempts||
        !this.object(claim.step)||
        same(claim.step)!==same(definition.value.steps.find(item=>item.id===(claim.step as Record<string,unknown>).id)))return this.invalid();
      const view=await this.views.validate(claim.view);if(!view.valid||
        view.value.stepId!==claim.step.id||
        same(view.value.workflow)!==same(claim.workflow)||
        same(view.value.request)!==same(row.request))return this.invalid();
      if((attempt.outcome===null)!==!["outcome","committed"].includes(attempt.stage as string)||
        (attempt.receipt!==null)!==(attempt.stage==="committed")||
        (attempt.outcome!==null&&!(await this.outcomes.validate(attempt.outcome)).valid)||
        (attempt.receipt!==null&&!(await this.receipts.validate(attempt.receipt)).valid))return this.invalid();
    }
    for(const result of row.accepted)if(!this.object(result)||
        !this.keys(result,["stepId","attemptId","receiptRef","result"])||
        !this.validId(result.stepId)||
        !this.validId(result.attemptId)||
        !this.ref(result.receiptRef))return this.invalid();
    const triggers=new Set<string>();
    for(const transition of row.transitions){if(!this.object(transition)||
        !this.keys(transition,["triggerAttemptId","transitionId","fixOperationId"])||
        !this.validId(transition.triggerAttemptId)||
        triggers.has(transition.triggerAttemptId as string)||
        !(transition.transitionId===null||
        definition.value.transitions.some(item=>item.id===transition.transitionId))||
        !(transition.fixOperationId===null||
        this.validId(transition.fixOperationId))||
        (transition.transitionId===null)!==(transition.fixOperationId===null))return this.invalid();triggers.add(transition.triggerAttemptId as string);}
    for(const transition of definition.value.transitions)if(row.transitions.filter(item=>(item as Record<string,unknown>).transitionId===transition.id).length>transition.maxTraversals)return this.invalid();
    if(row.transitionPlan!==null&&(!this.object(row.transitionPlan)||
        !this.keys(row.transitionPlan,["triggerAttemptId","transitionId","operationId"])||
        !this.validId(row.transitionPlan.triggerAttemptId)||
        !this.validId(row.transitionPlan.operationId)||
        !definition.value.transitions.some(item=>item.id===(row.transitionPlan as Record<string,unknown>).transitionId)))return this.invalid();
    const completion=row.completionDecision;if(completion!==null&&(!this.object(completion)||
        !((completion.accepted===true&&this.keys(completion,["accepted"]))||
        (completion.accepted===false&&this.keys(completion,["accepted","code","message"])&&typeof completion.code==="string"&&/^[A-Z0-9_:-]{1,128}$/.test(completion.code)&&typeof completion.message==="string"&&completion.message.length>0&&completion.message.length<=1024))))return this.invalid();
    if(row.outcome!==null&&!(await this.outcomes.validate(row.outcome)).valid)return this.invalid();
    try{const run=await WorkflowRun.restore(checked.value as unknown as WorkflowRunSnapshot);return {valid:true,value:run.snapshot()};}catch(error){if(!(error instanceof WorkflowRunError)&&!(error instanceof Error&&["InvalidLifecycleSnapshotError","InvalidLifecycleTransitionError"].includes(error.name)))throw error;return this.invalid();}
  }
  private object(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==="object"&&!Array.isArray(value);}
  private keys(row:Record<string,unknown>,keys:readonly string[]):boolean{return Object.keys(row).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(row,key));}
  private validId(value:unknown):boolean{return typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(value);}
  private ref(value:unknown):boolean{return typeof value==="string"&&value.length>0&&value.length<=256;}
  private integer(value:unknown):value is number{return typeof value==="number"&&Number.isSafeInteger(value)&&value>=0;}
  private reference(value:unknown):boolean{return this.object(value)&&this.keys(value,["id","version"])&&this.validId(value.id)&&this.validId(value.version);}
  private scope(value:unknown):boolean{return this.object(value)&&(this.keys(value,["scopeId","projectId"])||this.keys(value,["scopeId","projectId","workspaceId"]))&&this.validId(value.scopeId)&&this.validId(value.projectId)&&(value.workspaceId===undefined||this.validId(value.workspaceId));}
  private invalid():ValidationResult<never>{return {valid:false,issues:[{path:[],code:"INVALID_WORKFLOW_RUN",message:"Workflow run aggregate is malformed or inconsistent."}]};}
}
