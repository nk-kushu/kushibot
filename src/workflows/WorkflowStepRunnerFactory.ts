import type { IWorkflowStepRunnerFactory } from "./IWorkflowStepRunnerFactory.js";
import type { IStepAttemptJournal } from "./IStepAttemptJournal.js";
import type { IStepContextVerifier } from "./IStepContextVerifier.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import { WorkflowDefinitionRegistry } from "./WorkflowDefinitionRegistry.js";
import { ExecutorRegistry } from "../executors/ExecutorRegistry.js";
import { StepPolicyRegistry } from "./StepPolicyRegistry.js";
import { StepRunner } from "./StepRunner.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract.js";
import { StepInputPolicyInputContract } from "./StepInputPolicyInputContract.js";
import { StepResultAcceptanceContract } from "./StepResultAcceptanceContract.js";
import { StepAttemptReceiptContract } from "./StepAttemptReceiptContract.js";
export class WorkflowStepRunnerFactory implements IWorkflowStepRunnerFactory{
 constructor(private readonly definitions:WorkflowDefinitionRegistry,
    private readonly executors:ExecutorRegistry,
    private readonly policies:StepPolicyRegistry,
    private readonly ids:IIdGenerator,
    private readonly clock:IClock){}
 create(journal:IStepAttemptJournal,verifier:IStepContextVerifier):StepRunner{const json=new JsonValueContract(),outcomes=new ExecutionOutcomeContract(json,json),decisions=new StepResultAcceptanceContract(json);return new StepRunner(this.definitions,this.executors,this.policies,new StepInputPolicyInputContract(json),outcomes,decisions,new StepAttemptReceiptContract(json,outcomes,decisions),verifier,journal,json,this.ids,this.clock);}
}
