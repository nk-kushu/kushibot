import type { IPolicy } from "../contracts/IPolicy.js";
import type { RegistrationRef } from "../contracts/RegistrationRef.js";
import type { WorkflowTransitionInput } from "./WorkflowTransitionInput.js";
import type { WorkflowTransitionDecision } from "./WorkflowTransitionDecision.js";
import type { WorkflowCompletionInput } from "./WorkflowCompletionInput.js";
import type { WorkflowCompletionDecision } from "./WorkflowCompletionDecision.js";
import { WorkflowRunError } from "../errors/WorkflowRunError.js";
export class WorkflowPolicyRegistry{
 private readonly transitions=new Map<string,IPolicy<WorkflowTransitionInput,WorkflowTransitionDecision>>();private readonly completions=new Map<string,IPolicy<WorkflowCompletionInput,WorkflowCompletionDecision>>();
 registerTransition(ref:RegistrationRef,policy:IPolicy<WorkflowTransitionInput,WorkflowTransitionDecision>):void{const key=this.key(ref);if(this.transitions.has(key)||
        this.transitions.size>=64)throw new WorkflowRunError();this.transitions.set(key,Object.freeze({apply:policy.apply.bind(policy)}));}
 registerCompletion(ref:RegistrationRef,policy:IPolicy<WorkflowCompletionInput,WorkflowCompletionDecision>):void{const key=this.key(ref);if(this.completions.has(key)||
        this.completions.size>=64)throw new WorkflowRunError();this.completions.set(key,Object.freeze({apply:policy.apply.bind(policy)}));}
 transition(ref:RegistrationRef):IPolicy<WorkflowTransitionInput,WorkflowTransitionDecision>{const policy=this.transitions.get(this.key(ref));if(policy===undefined)throw new WorkflowRunError();return policy;}
 completion(ref:RegistrationRef):IPolicy<WorkflowCompletionInput,WorkflowCompletionDecision>{const policy=this.completions.get(this.key(ref));if(policy===undefined)throw new WorkflowRunError();return policy;}
 private key(ref:RegistrationRef):string{if(![ref.id,ref.version].every(id=>/^[A-Za-z0-9_.:-]{1,128}$/.test(id)))throw new WorkflowRunError();return JSON.stringify([ref.id,ref.version]);}
}
