import type { IPolicy,StepInputPolicyInput,JsonValue } from "../../src/index.js";
import { EditingResultContract,VerificationInputContract,JsonValueContract,StepExecutionError } from "../../src/index.js";
export class LoginVerificationInputPolicy implements IPolicy<StepInputPolicyInput,JsonValue>{
  constructor(private readonly edits:EditingResultContract,private readonly checks:VerificationInputContract,private readonly json:JsonValueContract){}
  async apply(view:StepInputPolicyInput):Promise<JsonValue>{const dependency=view.dependencies.find(result=>result.stepId==="edit");if(dependency===undefined)throw new StepExecutionError();const edit=await this.edits.validate(dependency.result);if(!edit.valid)throw new StepExecutionError();const input=await this.checks.validate({snapshotRef:edit.value.resultSnapshotRef,checkIds:["typecheck","expiry-test"]});if(!input.valid)throw new StepExecutionError();const value=await this.json.validate(input.value);if(!value.valid)throw new StepExecutionError();return value.value;}
}
