import type { IAgentTurn } from "./IAgentTurn.js";
import type { IAgentContextSource } from "./IAgentContextSource.js";
import type { SessionView } from "./SessionView.js";
import type { AgentTurnOutcome } from "./AgentTurnOutcome.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import { AgentContextComposer } from "../context/AgentContextComposer.js";
import { PromptCacheRequestPreparer } from "../model/prompt-cache/PromptCacheRequestPreparer.js";
import { BudgetedModelCall } from "../model/BudgetedModelCall.js";
import { AgentSessionError } from "../../errors/AgentSessionError.js";
export class ComposedAgentTurn implements IAgentTurn {
  constructor(private readonly source: IAgentContextSource, private readonly composer: AgentContextComposer, private readonly cache: PromptCacheRequestPreparer, private readonly call: BudgetedModelCall, private readonly timeoutMs: number) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new AgentSessionError();
  }
  async run(view: SessionView, context: IExecutionContext): Promise<AgentTurnOutcome> {
    const input = await this.source.build(view, context);
    if (input.assignment.pendingOperationRefs.length > 0) return { status: "uncertain", operationId: input.assignment.pendingOperationRefs[0], pendingOperationRefs: input.assignment.pendingOperationRefs };
    const composed = await this.composer.compose(input, context);
    if (composed.status === "stopped") return composed;
    if (composed.status !== "ready") return this.stop("Context cannot be verified or fitted.");
    const prepared = await this.cache.prepare(composed.context, context);
    if (prepared.status === "stopped") return prepared;
    if (prepared.status !== "ready") return this.stop("Provider request cannot be prepared.");
    const reply = await this.call.run(prepared.context.request, { operationId: context.identity.operationId, signal: context.signal, deadlineEpochMs: context.deadlineEpochMs, timeoutMs: this.timeoutMs });
    if (reply.status !== "received") return reply;
    if (reply.reply.usage === null) return { status: "uncertain", operationId: context.identity.operationId };
    if (reply.stopReason !== null) return { status: "stopped", reason: reply.stopReason };
    if (reply.reply.status !== "completed") return this.stop("Model did not supply a complete action.");
    return { status: "text", text: reply.reply.text };
  }
  private stop(message: string): AgentTurnOutcome { return { status: "stopped", reason: { code: "no-progress", message } }; }
}
