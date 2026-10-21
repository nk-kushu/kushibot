import type { IPolicy,StepInputPolicyInput,JsonValue } from "../../src/index.js";
import { TaskInputContract,JsonValueContract,StepExecutionError } from "../../src/index.js";
export class LoginDependencyInputPolicy implements IPolicy<StepInputPolicyInput,JsonValue>{
  constructor(private readonly dependencyId:string,private readonly tasks:TaskInputContract,private readonly json:JsonValueContract){}
  async apply(view:StepInputPolicyInput):Promise<JsonValue>{
    const task=await this.tasks.validate(view.request),dependency=view.dependencies.find(result=>result.stepId===this.dependencyId);if(!task.valid||
        dependency===undefined)throw new StepExecutionError();
    const input=await this.tasks.validate({...task.value,sourceRefs:[...new Set([...task.value.sourceRefs,dependency.receiptRef])]});if(!input.valid)throw new StepExecutionError();const value=await this.json.validate(input.value);if(!value.valid)throw new StepExecutionError();return value.value;
  }
}
