import { ExecutorRegistry,StepPolicyRegistry,WorkflowDefinitionContract,WorkflowDefinitionRegistry,TaskInputContract,EditingResultContract,VerificationInputContract,JsonValueContract } from "../../src/index.js";
import type { LoginAcceptancePolicies } from "./LoginAcceptancePolicies.js";
import { LoginInvestigationInputPolicy } from "./LoginInvestigationInputPolicy.js";
import { LoginDependencyInputPolicy } from "./LoginDependencyInputPolicy.js";
import { LoginVerificationInputPolicy } from "./LoginVerificationInputPolicy.js";
import { createLoginWorkflowDefinition } from "./createLoginWorkflowDefinition.js";
export async function createLoginWorkflowExample(executors:ExecutorRegistry,policies:StepPolicyRegistry,acceptance:LoginAcceptancePolicies):Promise<WorkflowDefinitionRegistry>{
  const json=new JsonValueContract(),tasks=new TaskInputContract(json);
  policies.registerInput({id:"login-investigation-input",version:"1"},new LoginInvestigationInputPolicy(tasks,json));
  policies.registerInput({id:"login-specification-input",version:"1"},new LoginDependencyInputPolicy("investigate",tasks,json));
  policies.registerInput({id:"login-editing-input",version:"1"},new LoginDependencyInputPolicy("specify",tasks,json));
  policies.registerInput({id:"login-verification-input",version:"1"},new LoginVerificationInputPolicy(new EditingResultContract(json),new VerificationInputContract(json),json));
  policies.registerAcceptance({id:"login-investigation-acceptance",version:"1"},acceptance.investigate);
  policies.registerAcceptance({id:"login-specification-acceptance",version:"1"},acceptance.specify);
  policies.registerAcceptance({id:"login-editing-acceptance",version:"1"},acceptance.edit);
  policies.registerAcceptance({id:"login-verification-acceptance",version:"1"},acceptance.verify);
  const definitions=new WorkflowDefinitionRegistry(new WorkflowDefinitionContract(json),executors,policies);
  await definitions.register(createLoginWorkflowDefinition(executors));return definitions;
}
