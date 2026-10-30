import type { IExecutor } from "../../executors/contracts/IExecutor.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome.js";
import type { IAgenticSessionFactory } from "./IAgenticSessionFactory.js";
import type { IScopedDebugRecorder } from "../../events/debug/IScopedDebugRecorder.js";
import { NoopDebugRecorder } from "../../events/debug/NoopDebugRecorder.js";
export class AgenticMindUnit<TResult> implements IExecutor<void, TResult> {
  constructor(private readonly sessions: IAgenticSessionFactory<TResult>,
    /** Traces the unit's session as one span; records nothing by default. */
    private readonly debug: IScopedDebugRecorder = new NoopDebugRecorder()) {}
  async execute(_input: void, context: IExecutionContext): Promise<ExecutionOutcome<TResult>> {
    const sessionId = context.identity.sessionId;
    return this.debug.operation("mind-unit.run", async () => {
      const outcome = await (await this.sessions.create(context)).execute(context);
      this.debug.event("progress.reported", outcome.status === "completed" ? "info" : "warn", {
        operation: "mind-unit.outcome",
        nextState: outcome.status,
        ...(outcome.status === "stopped" ? { code: outcome.reason.code.toUpperCase().replace(/[^A-Z0-9_]/g, "_"), summary: outcome.reason.message } : {}),
        ...(outcome.status === "failed" ? { code: outcome.error.code.toUpperCase().replace(/[^A-Z0-9_]/g, "_"), summary: outcome.error.message } : {}),
      });
      return outcome;
    }, { relatedRefs: sessionId ? [`session:${sessionId}`] : [] }, context.identity);
  }
}
