import type { IAgentToolCall } from "../agentic/sessions/IAgentToolCall.js";
import type { IScopedDebugRecorder } from "../events/debug/IScopedDebugRecorder.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { ToolCallRequest } from "../tools/ToolCallRequest.js";
import type { ToolDispatchOutcome } from "../tools/ToolDispatchOutcome.js";

/** Traces each tool dispatch: which tool, how long, and how it ended. Arguments are not recorded. */
export class DebugRecordingToolCall implements IAgentToolCall {
  constructor(private readonly tools: IAgentToolCall, private readonly debug: IScopedDebugRecorder) {}
  dispatch(request: ToolCallRequest, context: IExecutionContext): Promise<ToolDispatchOutcome> {
    return this.debug.operation("tool.call", async () => {
      const outcome = await this.tools.dispatch(request, context);
      this.debug.event("progress.reported", outcome.status === "completed" ? "debug" : "warn", {
        operation: "tool.outcome",
        nextState: outcome.status,
        ...(outcome.status === "rejected" ? { code: outcome.code } : {}),
        ...(outcome.status === "stopped" ? { code: outcome.reason.code.toUpperCase().replace(/[^A-Z0-9_]/g, "_") } : {}),
        relatedRefs: [`tool:${request.toolId}`, ...(outcome.status === "completed" && outcome.replayed ? ["replayed"] : [])],
      });
      return outcome;
    }, { relatedRefs: [`tool:${request.toolId}`, `operation:${request.operationId}`] });
  }
}
