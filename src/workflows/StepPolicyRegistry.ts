import type { IPolicy } from "../contracts/IPolicy.js";
import type { RegistrationRef } from "../contracts/RegistrationRef.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { StepInputPolicyInput } from "./StepInputPolicyInput.js";
import type { StepAcceptanceInput } from "./StepAcceptanceInput.js";
import type { StepAcceptanceDecision } from "./StepAcceptanceDecision.js";
import { WorkflowDefinitionError } from "../errors/WorkflowDefinitionError.js";
export class StepPolicyRegistry {
  private readonly inputs = new Map<string,IPolicy<StepInputPolicyInput,JsonValue>>();
  private readonly acceptance = new Map<string,IPolicy<StepAcceptanceInput,StepAcceptanceDecision>>();
  registerInput(ref:RegistrationRef, policy:IPolicy<StepInputPolicyInput,JsonValue>):void { const key=this.key(ref); if(this.inputs.has(key)||
        this.inputs.size>=128)throw new WorkflowDefinitionError(); this.inputs.set(key,Object.freeze({apply:policy.apply.bind(policy)})); }
  registerAcceptance(ref:RegistrationRef, policy:IPolicy<StepAcceptanceInput,StepAcceptanceDecision>):void { const key=this.key(ref); if(this.acceptance.has(key)||
        this.acceptance.size>=128)throw new WorkflowDefinitionError(); this.acceptance.set(key,Object.freeze({apply:policy.apply.bind(policy)})); }
  input(ref:RegistrationRef):IPolicy<StepInputPolicyInput,JsonValue> { const policy=this.inputs.get(this.key(ref)); if(policy===undefined)throw new WorkflowDefinitionError(); return policy; }
  accept(ref:RegistrationRef):IPolicy<StepAcceptanceInput,StepAcceptanceDecision> { const policy=this.acceptance.get(this.key(ref)); if(policy===undefined)throw new WorkflowDefinitionError(); return policy; }
  private key(ref:RegistrationRef):string { if(![ref.id,ref.version].every(value=>/^[A-Za-z0-9_.:-]{1,128}$/.test(value)))throw new WorkflowDefinitionError(); return JSON.stringify([ref.id,ref.version]); }
}
