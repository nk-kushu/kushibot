import type { IAgentTaskFactory, IClock, InvestigationResult, EditingResult } from "../../src/index.js";
import { JsonValueContract, TaskInputContract, InvestigationResultContract, EditingResultContract, VerificationInputContract, VerificationCheckResultContract, VerificationResultContract, WorkspaceInvestigationExecutor, StructuredTaskExecutor, WorkspaceEditingExecutor, VerificationExecutor, DefaultAgentAssignmentPolicy, ExecutorRegistration, ExecutorRegistry } from "../../src/index.js";
import type { LoginSpecificationResult } from "./LoginSpecificationResult.js";
import { LoginSpecificationContract } from "./LoginSpecificationContract.js";
export class LoginExecutorsExample {
  constructor(private readonly investigation: IAgentTaskFactory<InvestigationResult>,
    private readonly specification: IAgentTaskFactory<LoginSpecificationResult>,
    private readonly editing: IAgentTaskFactory<EditingResult>,
    private readonly verification: VerificationExecutor,
    private readonly clock: IClock) {}
  createRegistry(): ExecutorRegistry {
    const json = new JsonValueContract(), task = new TaskInputContract(json);
    const findings = new InvestigationResultContract(json), specification = new LoginSpecificationContract(json), changes = new EditingResultContract(json);
    const investigate = new WorkspaceInvestigationExecutor(task,findings,new DefaultAgentAssignmentPolicy("Inspect permitted login source and cite verified evidence. Do not change files."),this.investigation,json,this.clock);
    const specify = new StructuredTaskExecutor(task,specification,new DefaultAgentAssignmentPolicy("Prepare a source-backed login specification; preserve password login and require expiry validation."),this.specification,json,this.clock);
    const edit = new WorkspaceEditingExecutor(task,changes,new DefaultAgentAssignmentPolicy("Implement only the accepted specification in the permitted working copy; retain change/check references."),this.editing,json,this.clock);
    const verificationInput = new VerificationInputContract(json), verificationResult = new VerificationResultContract(json,new VerificationCheckResultContract(json));
    const registry = new ExecutorRegistry();
    registry.register(new ExecutorRegistration("workspace-investigation","1",task,findings,investigate,json,this.clock));
    registry.register(new ExecutorRegistration("login-specification","1",task,specification,specify,json,this.clock));
    registry.register(new ExecutorRegistration("workspace-editing","1",task,changes,edit,json,this.clock));
    registry.register(new ExecutorRegistration("verification","1",verificationInput,verificationResult,this.verification,json,this.clock));
    return registry;
  }
}
