import type { WorkflowDefinition } from "./WorkflowDefinition.js";
import type { RegistrationRef } from "../contracts/RegistrationRef.js";
import { WorkflowDefinitionContract } from "./WorkflowDefinitionContract.js";
import { StepPolicyRegistry } from "./StepPolicyRegistry.js";
import { ExecutorRegistry } from "../executors/ExecutorRegistry.js";
import { WorkflowDefinitionError } from "../errors/WorkflowDefinitionError.js";
export class WorkflowDefinitionRegistry {
  private readonly definitions=new Map<string,WorkflowDefinition>();
  constructor(private readonly contract:WorkflowDefinitionContract,private readonly executors:ExecutorRegistry,private readonly policies:StepPolicyRegistry){}
  async register(raw:unknown):Promise<void>{
    const checked=await this.contract.validate(raw);if(!checked.valid)throw new WorkflowDefinitionError();
    for(const step of checked.value.steps){const actual=this.executors.resolve(step.executor.id,step.executor.version).metadata;if(Object.keys(actual).some(key=>actual[key as keyof typeof actual]!==step.executor[key as keyof typeof actual]))throw new WorkflowDefinitionError();this.policies.input(step.inputPolicy);this.policies.accept(step.acceptancePolicy);}
    const key=this.key(checked.value);if(this.definitions.has(key)||this.definitions.size>=64)throw new WorkflowDefinitionError();this.definitions.set(key,checked.value);
  }
  resolve(ref:RegistrationRef):WorkflowDefinition{const definition=this.definitions.get(this.key(ref));if(definition===undefined)throw new WorkflowDefinitionError();return definition;}
  private key(ref:RegistrationRef):string{if(![ref.id,ref.version].every(value=>/^[A-Za-z0-9_.:-]{1,128}$/.test(value)))throw new WorkflowDefinitionError();return JSON.stringify([ref.id,ref.version]);}
}
