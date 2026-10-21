import type { IIdGenerator } from "./IIdGenerator.js";
import type { IResultContract } from "../validation/IResultContract.js";
import type { ExecutionIdentity } from "./ExecutionIdentity.js";
import { InvalidExecutionIdentityError } from "../../errors/InvalidExecutionIdentityError.js";

export class ExecutionIdentityFactory {
  constructor(
    private readonly ids: IIdGenerator,
    private readonly contract: IResultContract<ExecutionIdentity>,
  ) {}

  async createRun(): Promise<ExecutionIdentity> {
    return this.checked({ operationId: this.ids.nextId(), runId: this.ids.nextId() });
  }

  async createStep(parent: ExecutionIdentity): Promise<ExecutionIdentity> {
    const run = await this.checked(parent);
    if (run.runId === undefined || run.stepRunId !== undefined || run.sessionId !== undefined) {
      throw new InvalidExecutionIdentityError("A step requires a workflow-run parent identity.");
    }
    return this.checked({
      operationId: this.ids.nextId(),
      runId: run.runId,
      stepRunId: this.ids.nextId(),
      parentOperationId: run.operationId,
    });
  }

  async createSession(parent?: ExecutionIdentity): Promise<ExecutionIdentity> {
    const owner = parent === undefined ? undefined : await this.checked(parent);
    return this.checked({
      ...(owner === undefined ? {} : owner),
      operationId: this.ids.nextId(),
      sessionId: this.ids.nextId(),
      ...(owner === undefined ? {} : { parentOperationId: owner.operationId }),
    });
  }

  async createOperation(parent: ExecutionIdentity): Promise<ExecutionIdentity> {
    const owner = await this.checked(parent);
    return this.checked({
      ...owner,
      operationId: this.ids.nextId(),
      parentOperationId: owner.operationId,
    });
  }

  private async checked(value: unknown): Promise<ExecutionIdentity> {
    const validated = await this.contract.validate(value);
    if (!validated.valid) throw new InvalidExecutionIdentityError("Identity validation failed.");
    return validated.value;
  }
}
