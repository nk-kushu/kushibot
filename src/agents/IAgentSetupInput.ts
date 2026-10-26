import type { AgentRunRuntime } from "./AgentRunRuntime.js";

export interface IAgentSetupInput<TTask> {
  readonly task: TTask;
  readonly runtime: AgentRunRuntime;
}
