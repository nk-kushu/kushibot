import type { IPolicy,WorkflowTransitionInput,WorkflowTransitionDecision } from "../../src/index.js";
import { VerificationResultContract } from "../../src/index.js";
export class FailedLoginVerificationTransitionPolicy implements IPolicy<WorkflowTransitionInput,WorkflowTransitionDecision>{
 constructor(private readonly results:VerificationResultContract){}
 async apply(input:WorkflowTransitionInput):Promise<WorkflowTransitionDecision>{if(input.trigger.acceptance.status!=="accepted"||
        input.trigger.stepId!=="verify"||
        input.trigger.outcome.status!=="completed")return {take:false};const result=await this.results.validate(input.trigger.outcome.result);return {take:result.valid&&!result.value.passed};}
}
