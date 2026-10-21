import type { IExecutor } from "./IExecutor.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import type { ExecutorMetadata } from "../ExecutorMetadata.js";
export interface IExecutorRegistration extends IExecutor<unknown,JsonValue> { readonly metadata: ExecutorMetadata; }
