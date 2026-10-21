import type { WorkflowStepAttempt } from "./WorkflowStepAttempt.js";
import type { StepRunRequest } from "./StepRunRequest.js";
import type { StepRunOutcome } from "./StepRunOutcome.js";
import type { StepAttemptClaim } from "./StepAttemptClaim.js";
import type { StepResultAcceptance } from "./StepResultAcceptance.js";
import type { IStepContextVerifier } from "./IStepContextVerifier.js";
import type { IStepAttemptJournal } from "./IStepAttemptJournal.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import { WorkflowDefinitionRegistry } from "./WorkflowDefinitionRegistry.js";
import { StepPolicyRegistry } from "./StepPolicyRegistry.js";
import { StepInputPolicyInputContract } from "./StepInputPolicyInputContract.js";
import { StepResultAcceptanceContract } from "./StepResultAcceptanceContract.js";
import { StepAttemptReceiptContract } from "./StepAttemptReceiptContract.js";
import { ExecutorRegistry } from "../executors/ExecutorRegistry.js";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { StepExecutionError } from "../errors/StepExecutionError.js";
export class StepRunner{
  constructor(private readonly definitions:WorkflowDefinitionRegistry,
    private readonly executors:ExecutorRegistry,
    private readonly policies:StepPolicyRegistry,
    private readonly views:StepInputPolicyInputContract,
    private readonly outcomes:ExecutionOutcomeContract<JsonValue>,
    private readonly decisions:StepResultAcceptanceContract,
    private readonly receipts:StepAttemptReceiptContract,
    private readonly verifier:IStepContextVerifier,
    private readonly journal:IStepAttemptJournal,
    private readonly json:JsonValueContract,
    private readonly ids:IIdGenerator,
    private readonly clock:IClock){}
  async run(request:StepRunRequest,context:IExecutionContext):Promise<StepRunOutcome>{
    context=Object.freeze({...context,identity:Object.freeze({...context.identity}),scope:Object.freeze({...context.scope})});
    if(![context.identity.operationId,context.identity.runId,context.identity.stepRunId].every(value=>typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(value))||
        context.identity.sessionId!==undefined)throw new StepExecutionError();
    const definition=this.definitions.resolve(request.workflow),step=definition.steps.find(item=>item.id===request.stepId);
    const checked=await this.views.validate(request.view);if(step===undefined||!checked.valid)return {status:"blocked",code:"INVALID_STEP_VIEW"};const view=checked.value;
    if(view.workflow.id!==definition.id||
        view.workflow.version!==definition.version||
        view.stepId!==step.id||
        view.dependencies.length!==step.dependencies.length||
        view.dependencies.some(dependency=>!step.dependencies.includes(dependency.stepId)))return {status:"blocked",code:"STEP_DEPENDENCIES_MISMATCH"};
    const guard=new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);
    if(guard.check()!==null)return {status:"blocked",code:"STEP_CONTROL_STOP"};
    if(!await this.verifier.verify(view,definition,context))return {status:"blocked",code:"STEP_VIEW_UNVERIFIED"};
    if(guard.check()!==null)return {status:"blocked",code:"STEP_CONTROL_STOP"};
    const fresh=[this.ids.nextId(),this.ids.nextId(),this.ids.nextId()];if(new Set(fresh).size!==3||
        fresh.some(id=>!/^[A-Za-z0-9_.:-]{1,128}$/.test(id)||
        [context.identity.operationId,context.identity.runId,context.identity.stepRunId].includes(id)))throw new StepExecutionError();
    const claim:StepAttemptClaim=Object.freeze({commandId:context.identity.operationId,ownerToken:fresh[0],attemptId:fresh[1],operationId:fresh[2],stepRunId:context.identity.stepRunId!,runId:context.identity.runId!,scope:Object.freeze({...context.scope}),workflow:Object.freeze({id:definition.id,version:definition.version}),step,view,maxRunAttempts:definition.maxTotalAttempts});
    const admission=await this.journal.claim(claim);
    if(admission.status==="blocked")return this.safeBlocked(admission.code);
    if(admission.status==="existing")return this.existing(admission.outcome,claim);
    const attemptNumber=admission.attemptNumber;if(!Number.isSafeInteger(attemptNumber)||attemptNumber<1||attemptNumber>step.maxAttempts)throw new StepExecutionError();
    const execution:IExecutionContext=Object.freeze({...context,scope:claim.scope,identity:Object.freeze({...context.identity,operationId:claim.operationId,parentOperationId:claim.commandId})});
    return this.advance(claim,attemptNumber,execution,null,null);
  }
  async resume(attempt:WorkflowStepAttempt,context:IExecutionContext):Promise<StepRunOutcome>{
    if(attempt.receipt!==null)return this.existing({status:"recorded",receipt:attempt.receipt},attempt.claim);
    if(attempt.stage==="dispatching")return {status:"pending",attemptId:attempt.claim.attemptId,pendingOperationRefs:[attempt.claim.operationId]};
    if(context.identity.runId!==attempt.claim.runId||context.identity.stepRunId!==attempt.claim.stepRunId||context.identity.operationId!==attempt.claim.operationId)throw new StepExecutionError();
    return this.advance(attempt.claim,attempt.attemptNumber,context,attempt.stage==="claimed"?null:{value:attempt.input},attempt.outcome);
  }
  private async advance(claim:StepAttemptClaim,attemptNumber:number,execution:IExecutionContext,prepared:Readonly<{value:JsonValue}>|null,saved:ExecutionOutcome<JsonValue>|null):Promise<StepRunOutcome>{
    const view=claim.view,step=claim.step,definition=this.definitions.resolve(claim.workflow),guard=new ExecutionBoundaryGuard(this.clock,execution.signal,execution.deadlineEpochMs);
    const projected=prepared!==null?prepared.value:await this.policies.input(step.inputPolicy).apply(view),input=await this.json.validate(projected);
    if(!input.valid||
        new TextEncoder().encode(JSON.stringify(input.value)).byteLength>65536){const failed:ExecutionOutcome<JsonValue>={status:"failed",error:{code:"STEP_INPUT_POLICY_INVALID",message:"Input policy did not produce bounded JSON."},partial:{summary:"",evidenceRefs:[],artifactRefs:[],unresolved:["Prepare valid executor input."]},pendingOperationRefs:[]};await this.journal.recordOutcome(claim.attemptId,claim.ownerToken,failed);return this.finish(claim,attemptNumber,failed,{status:"not-evaluated",code:"INPUT_REJECTED",message:"Executor did not start."},execution);}
    if(prepared===null)await this.journal.prepare(claim.attemptId,claim.ownerToken,input.value);
    let outcome:import("../contracts/validation/ValidationResult.js").ValidationResult<ExecutionOutcome<JsonValue>>;
    if(saved!==null){outcome=await this.outcomes.validate(saved);if(!outcome.valid)throw new StepExecutionError();}
    else{
    const stop=guard.check();const verified=stop===null&&await this.verifier.verify(view,definition,execution);const afterVerify=guard.check();
    if(stop!==null||
        afterVerify!==null||
        !verified){const reason=stop??afterVerify??{code:"no-progress" as const,message:"Prepared step context is no longer current."};const stopped:ExecutionOutcome<JsonValue>={status:"stopped",reason,partial:{summary:"Prepared executor input is retained in the attempt journal.",evidenceRefs:[],artifactRefs:[],unresolved:["Executor did not start."]},pendingOperationRefs:[]};await this.journal.recordOutcome(claim.attemptId,claim.ownerToken,stopped);return this.finish(claim,attemptNumber,stopped,{status:"not-evaluated",code:"DISPATCH_BLOCKED",message:"Controls or source view prevented dispatch."},execution);}
    if(!await this.journal.beginDispatch(claim.attemptId,claim.ownerToken))return {status:"pending",attemptId:claim.attemptId,pendingOperationRefs:[claim.operationId]};
    const dispatchStop=guard.check();
    if(dispatchStop!==null){const stopped:ExecutionOutcome<JsonValue>={status:"stopped",reason:dispatchStop,partial:{summary:"Prepared input retained; executor did not start.",evidenceRefs:[],artifactRefs:[],unresolved:["Executor did not start."]},pendingOperationRefs:[]};await this.journal.recordOutcome(claim.attemptId,claim.ownerToken,stopped);return this.finish(claim,attemptNumber,stopped,{status:"not-evaluated",code:"DISPATCH_BLOCKED",message:"Controls prevented executor invocation."},execution);}
    const registered=this.executors.resolve(step.executor.id,step.executor.version);
    outcome=await this.outcomes.validate(await registered.execute(input.value,execution));if(!outcome.valid)throw new StepExecutionError();
    await this.journal.recordOutcome(claim.attemptId,claim.ownerToken,outcome.value);
    }
    if(outcome.value.status!=="completed")return this.finish(claim,attemptNumber,outcome.value,{status:"not-evaluated",code:"EXECUTOR_INCOMPLETE",message:"Executor returned stopped or failed work."},execution);
    if(guard.check()!==null)return this.finish(claim,attemptNumber,outcome.value,{status:"not-evaluated",code:"STEP_CONTROL_STOP",message:"Candidate retained; controls prevent acceptance."},execution);
    if(!await this.verifier.verify(view,definition,execution))return this.finish(claim,attemptNumber,outcome.value,{status:"not-evaluated",code:"STALE_STEP_VIEW",message:"Candidate retained; dependency/source view changed."},execution);
    if(guard.check()!==null)return this.finish(claim,attemptNumber,outcome.value,{status:"not-evaluated",code:"STEP_CONTROL_STOP",message:"Candidate retained; controls prevent acceptance."},execution);
    const rawDecision=await this.policies.accept(step.acceptancePolicy).apply(Object.freeze({view,input:input.value,candidate:outcome.value.result,execution}));
    const decision=await this.decisions.validate(rawDecision);if(!decision.valid||decision.value.status==="not-evaluated")throw new StepExecutionError();
    let acceptance:StepResultAcceptance=decision.value;
    if(guard.check()!==null)acceptance={status:"not-evaluated",code:"STEP_CONTROL_STOP",message:"Candidate retained; controls prevent acceptance."};
    else if(!await this.verifier.verify(view,definition,execution))acceptance={status:"not-evaluated",code:"STALE_STEP_VIEW",message:"Candidate retained; dependency/source view changed."};
    if(guard.check()!==null)acceptance={status:"not-evaluated",code:"STEP_CONTROL_STOP",message:"Candidate retained; controls prevent acceptance."};
    return this.finish(claim,attemptNumber,outcome.value,acceptance,execution);
  }
  private async finish(claim:StepAttemptClaim,attemptNumber:number,outcome:ExecutionOutcome<JsonValue>,acceptance:StepResultAcceptance,context:IExecutionContext):Promise<StepRunOutcome>{
    const expected=await this.outcomes.validate(outcome);if(!expected.valid)throw new StepExecutionError();
    const receipt=await this.receipts.validate(await this.journal.commit(claim.attemptId,claim.ownerToken,acceptance,context));if(!receipt.valid)throw new StepExecutionError();
    this.match(receipt.value,claim);if(receipt.value.attemptId!==claim.attemptId||
        receipt.value.attemptNumber!==attemptNumber||
        JSON.stringify(receipt.value.outcome)!==JSON.stringify(expected.value)||
        (receipt.value.acceptance.status==="accepted"&&acceptance.status!=="accepted"))throw new StepExecutionError();
    return {status:"recorded",receipt:receipt.value};
  }
  private async existing(outcome:StepRunOutcome,claim:StepAttemptClaim):Promise<StepRunOutcome>{
    if(outcome.status==="recorded"){const receipt=await this.receipts.validate(outcome.receipt);if(!receipt.valid)throw new StepExecutionError();this.match(receipt.value,claim);return {status:"recorded",receipt:receipt.value};}
    if(outcome.status==="blocked")return this.safeBlocked(outcome.code);
    if(outcome.status!=="pending"||
        !/^[A-Za-z0-9_.:-]{1,128}$/.test(outcome.attemptId)||
        !Array.isArray(outcome.pendingOperationRefs)||
        outcome.pendingOperationRefs.length<1||
        outcome.pendingOperationRefs.length>64||
        outcome.pendingOperationRefs.some(ref=>typeof ref!=="string"||
        ref.length<1||
        ref.length>256))throw new StepExecutionError();
    return Object.freeze({status:"pending",attemptId:outcome.attemptId,pendingOperationRefs:Object.freeze([...outcome.pendingOperationRefs])});
  }
  private match(receipt:import("./StepAttemptReceipt.js").StepAttemptReceipt,claim:StepAttemptClaim):void{if(receipt.attemptNumber>claim.step.maxAttempts||
        receipt.runId!==claim.runId||
        receipt.stepRunId!==claim.stepRunId||
        receipt.stepId!==claim.step.id||
        receipt.workflow.id!==claim.workflow.id||
        receipt.workflow.version!==claim.workflow.version||
        receipt.viewRef!==claim.view.viewRef||
        (["id","version","inputContractId","inputContractVersion","resultContractId","resultContractVersion"] as const).some(key=>receipt.executor[key]!==claim.step.executor[key]))throw new StepExecutionError();}
  private safeBlocked(code:string):StepRunOutcome{if(!/^[A-Z0-9_:-]{1,128}$/.test(code))throw new StepExecutionError();return {status:"blocked",code};}
}
