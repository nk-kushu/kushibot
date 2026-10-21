import type { IExecutor } from "../../executors/contracts/IExecutor.js";
import type { IResultContract } from "../../contracts/validation/IResultContract.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
export type ChildAgentBinding = Readonly<{ unit: IExecutor<void, JsonValue>; resultContract: IResultContract<JsonValue> }>;
