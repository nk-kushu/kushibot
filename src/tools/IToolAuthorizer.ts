import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { ToolDescriptor } from "./ToolDescriptor.js";
export interface IToolAuthorizer { authorize(tool: ToolDescriptor, args: JsonValue, context: IExecutionContext): Promise<boolean>; }
