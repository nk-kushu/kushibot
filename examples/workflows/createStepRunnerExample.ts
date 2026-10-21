import type { IStepContextVerifier,IStepAttemptJournal,IIdGenerator,IClock } from "../../src/index.js";
import { WorkflowDefinitionRegistry,ExecutorRegistry,StepPolicyRegistry,StepRunner,JsonValueContract,ExecutionOutcomeContract,StepInputPolicyInputContract,StepResultAcceptanceContract,StepAttemptReceiptContract } from "../../src/index.js";
export function createStepRunnerExample(definitions:WorkflowDefinitionRegistry,executors:ExecutorRegistry,policies:StepPolicyRegistry,verifier:IStepContextVerifier,journal:IStepAttemptJournal,ids:IIdGenerator,clock:IClock):StepRunner{
  const json=new JsonValueContract();
  const views=new StepInputPolicyInputContract(json);
  const outcomes=new ExecutionOutcomeContract(json,json);
  const decisions=new StepResultAcceptanceContract(json);
  const receipts=new StepAttemptReceiptContract(json,outcomes,decisions);
  return new StepRunner(definitions,executors,policies,views,outcomes,decisions,receipts,verifier,journal,json,ids,clock);
}
