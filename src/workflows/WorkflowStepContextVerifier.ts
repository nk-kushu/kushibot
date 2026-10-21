import type { IStepContextVerifier } from "./IStepContextVerifier.js";
import type { IWorkflowRunStore } from "./IWorkflowRunStore.js";
import type { IPolicy } from "../contracts/IPolicy.js";
import type { StepContextEvidenceInput } from "./StepContextEvidenceInput.js";
import type { StepInputPolicyInput } from "./StepInputPolicyInput.js";
import type { WorkflowDefinition } from "./WorkflowDefinition.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import { WorkflowRun } from "./WorkflowRun.js";
import { canonicalWorkflowValue as same } from "./canonicalWorkflowValue.js";
export class WorkflowStepContextVerifier implements IStepContextVerifier{
 constructor(private readonly store:IWorkflowRunStore,private readonly evidence:IPolicy<StepContextEvidenceInput,boolean>){}
 async verify(view:StepInputPolicyInput,definition:WorkflowDefinition,context:IExecutionContext):Promise<boolean>{const snapshot=await this.store.read();if(context.identity.runId!==snapshot.runId||
        same(context.scope)!==same(snapshot.scope)||
        same(definition)!==same(snapshot.definition))return false;const run=await WorkflowRun.restore(snapshot);return run.current(view)&&await this.evidence.apply(Object.freeze({run:snapshot,view,execution:context}))===true;}
}
