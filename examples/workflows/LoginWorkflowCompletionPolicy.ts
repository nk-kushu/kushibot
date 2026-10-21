import type { IPolicy,WorkflowCompletionInput,WorkflowCompletionDecision,IVerificationReceiptVerifier } from "../../src/index.js";
import { EditingResultContract,VerificationResultContract } from "../../src/index.js";
export class LoginWorkflowCompletionPolicy implements IPolicy<WorkflowCompletionInput,WorkflowCompletionDecision>{
 constructor(private readonly edits:EditingResultContract,private readonly checks:VerificationResultContract,private readonly evidence:IVerificationReceiptVerifier){}
 async apply(input:WorkflowCompletionInput):Promise<WorkflowCompletionDecision>{
  const edit=input.run.accepted.find(item=>item.stepId==="edit"),verify=input.run.accepted.find(item=>item.stepId==="verify");
  if(edit===undefined||verify===undefined)return {accepted:false,code:"LOGIN_RESULTS_MISSING",message:"Accepted editing and verification results are required."};
  const changes=await this.edits.validate(edit.result),checks=await this.checks.validate(verify.result);
  if(!changes.valid||
        !checks.valid||
        !checks.value.passed||
        changes.value.resultSnapshotRef!==checks.value.snapshotRef||
        !["typecheck","expiry-test"].every(id=>checks.value.checks.some(check=>check.checkId===id)))return {accepted:false,code:"LOGIN_CHECKS_INCOMPLETE",message:"Current login change requires passing typecheck and expiry checks on its exact snapshot."};
  for(const receipt of checks.value.checks)if(!await this.evidence.verify(receipt,input.execution))return {accepted:false,code:"LOGIN_EVIDENCE_STALE",message:"Saved check evidence could not be verified."};
  return {accepted:true};
 }
}
