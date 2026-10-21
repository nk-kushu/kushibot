import type { ToolDescriptor } from "./ToolDescriptor.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export interface ITool {
  readonly descriptor: ToolDescriptor;
  readonly argumentsContract: IResultContract<JsonValue>;
  readonly resultContract: IResultContract<JsonValue>;
  execute(argumentsValue: JsonValue, context: IExecutionContext): Promise<unknown>;
}
