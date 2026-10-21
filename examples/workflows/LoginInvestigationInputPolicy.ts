import type { IPolicy,StepInputPolicyInput,JsonValue } from "../../src/index.js";
import { TaskInputContract,JsonValueContract,StepExecutionError } from "../../src/index.js";
export class LoginInvestigationInputPolicy implements IPolicy<StepInputPolicyInput,JsonValue>{
  constructor(private readonly tasks:TaskInputContract,private readonly json:JsonValueContract){}
  async apply(view:StepInputPolicyInput):Promise<JsonValue>{const task=await this.tasks.validate(view.request);if(!task.valid)throw new StepExecutionError();const value=await this.json.validate(task.value);if(!value.valid)throw new StepExecutionError();return value.value;}
}
