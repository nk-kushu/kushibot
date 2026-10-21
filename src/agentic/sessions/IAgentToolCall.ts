import type { ToolCallRequest } from "../../tools/ToolCallRequest.js";
import type { ToolDispatchOutcome } from "../../tools/ToolDispatchOutcome.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
export interface IAgentToolCall { dispatch(request: ToolCallRequest, context: IExecutionContext): Promise<ToolDispatchOutcome>; }
