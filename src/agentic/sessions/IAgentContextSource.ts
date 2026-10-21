import type { ContextCompositionInput } from "../context/ContextCompositionInput.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { SessionView } from "./SessionView.js";
export interface IAgentContextSource { build(view: SessionView, context: IExecutionContext): Promise<ContextCompositionInput>; }
