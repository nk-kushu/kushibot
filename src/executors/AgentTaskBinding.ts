import type { IExecutionContext } from "./contracts/IExecutionContext.js";
import type { AgenticMindUnit } from "../agentic/sessions/AgenticMindUnit.js";
export type AgentTaskBinding<TResult> = Readonly<{ unit: AgenticMindUnit<TResult>; context: IExecutionContext }>;
