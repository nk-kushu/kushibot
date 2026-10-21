import type { IWorkflowRunStore,IPolicy,StepContextEvidenceInput,IUsageLedgerStore,IVerificationReceiptVerifier,IIdGenerator,IClock } from "../../src/index.js";
import { WorkflowDefinitionRegistry,ExecutorRegistry,StepPolicyRegistry,WorkflowPolicyRegistry,WorkflowStepRunnerFactory,WorkflowEngine,JsonValueContract,EditingResultContract,VerificationCheckResultContract,VerificationResultContract } from "../../src/index.js";
import { FailedLoginVerificationTransitionPolicy } from "./FailedLoginVerificationTransitionPolicy.js";
import { LoginWorkflowCompletionPolicy } from "./LoginWorkflowCompletionPolicy.js";
export function createLoginWorkflowEngineExample(store:IWorkflowRunStore,definitions:WorkflowDefinitionRegistry,executors:ExecutorRegistry,stepPolicies:StepPolicyRegistry,ledger:IUsageLedgerStore,sourceEvidence:IPolicy<StepContextEvidenceInput,boolean>,checkEvidence:IVerificationReceiptVerifier,ids:IIdGenerator,clock:IClock):WorkflowEngine{
 const json=new JsonValueContract(),checks=new VerificationResultContract(json,new VerificationCheckResultContract(json));
 const policies=new WorkflowPolicyRegistry();
 policies.registerTransition({id:"failed-login-checks",version:"1"},new FailedLoginVerificationTransitionPolicy(checks));
 policies.registerCompletion({id:"login-completion",version:"1"},new LoginWorkflowCompletionPolicy(new EditingResultContract(json),checks,checkEvidence));
 const runners=new WorkflowStepRunnerFactory(definitions,executors,stepPolicies,ids,clock);
 return new WorkflowEngine(store,runners,policies,sourceEvidence,ledger,ids,clock,json);
}
