import type { WorkflowDefinition } from "../../src/index.js";
import { ExecutorRegistry } from "../../src/index.js";
export function createLoginWorkflowDefinition(executors:ExecutorRegistry):WorkflowDefinition{
  return {id:"google-login",version:"1",maxTotalAttempts:12,transitions:[],steps:[
    {id:"investigate",dependencies:[],executor:executors.resolve("workspace-investigation","1").metadata,inputPolicy:{id:"login-investigation-input",version:"1"},acceptancePolicy:{id:"login-investigation-acceptance",version:"1"},maxAttempts:2},
    {id:"specify",dependencies:["investigate"],executor:executors.resolve("login-specification","1").metadata,inputPolicy:{id:"login-specification-input",version:"1"},acceptancePolicy:{id:"login-specification-acceptance",version:"1"},maxAttempts:3},
    {id:"edit",dependencies:["specify"],executor:executors.resolve("workspace-editing","1").metadata,inputPolicy:{id:"login-editing-input",version:"1"},acceptancePolicy:{id:"login-editing-acceptance",version:"1"},maxAttempts:4},
    {id:"verify",dependencies:["edit"],executor:executors.resolve("verification","1").metadata,inputPolicy:{id:"login-verification-input",version:"1"},acceptancePolicy:{id:"login-verification-acceptance",version:"1"},maxAttempts:3}
  ]};
}
