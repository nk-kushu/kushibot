import type { AgenticSession } from "./AgenticSession.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
export interface IAgenticSessionFactory<TResult> { create(context: IExecutionContext): Promise<AgenticSession<TResult>>; }
