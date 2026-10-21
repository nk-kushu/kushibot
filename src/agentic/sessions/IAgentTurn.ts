import type { SessionView } from "./SessionView.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { AgentTurnOutcome } from "./AgentTurnOutcome.js";
export interface IAgentTurn { run(view: SessionView, context: IExecutionContext): Promise<AgentTurnOutcome>; }
