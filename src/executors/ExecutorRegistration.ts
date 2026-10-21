import type { IExecutorRegistration } from "./contracts/IExecutorRegistration.js";
import type { IExecutor } from "./contracts/IExecutor.js";
import type { IExecutionContext } from "./contracts/IExecutionContext.js";
import type { ExecutorMetadata } from "./ExecutorMetadata.js";
import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { ValidatedExecutor } from "./ValidatedExecutor.js";
import { ExecutorContractError } from "../errors/ExecutorContractError.js";
export class ExecutorRegistration<TInput,TResult> implements IExecutorRegistration {
  readonly metadata: ExecutorMetadata;
  private readonly checked: ValidatedExecutor<TInput,TResult>;
  constructor(id: string, version: string, input: IResultContract<TInput>, result: IResultContract<TResult>, executor: IExecutor<TInput,TResult>,
    private readonly json: JsonValueContract, clock: IClock) {
    if (![id,version,input.id,input.version,result.id,result.version].every(value => /^[A-Za-z0-9_.:-]{1,128}$/.test(value))) throw new ExecutorContractError();
    this.metadata = Object.freeze({id,version,inputContractId:input.id,inputContractVersion:input.version,resultContractId:result.id,resultContractVersion:result.version});
    this.checked = new ValidatedExecutor(input,new ExecutionOutcomeContract(result,json),executor,json,clock);
  }
  async execute(raw: unknown, context: IExecutionContext): Promise<ExecutionOutcome<JsonValue>> {
    const outcome = await this.checked.execute(raw as TInput,context);
    const copy = await this.json.validate(outcome); if (!copy.valid) throw new ExecutorContractError();
    return copy.value as unknown as ExecutionOutcome<JsonValue>;
  }
}
