import type { IAgentTurn } from "./IAgentTurn.js";
import type { IAgentToolCall } from "./IAgentToolCall.js";
import type { ISessionJournal } from "./ISessionJournal.js";
import type { SessionView } from "./SessionView.js";
import type { CompletionInput } from "./CompletionInput.js";
import type { CompletionDecision } from "./CompletionDecision.js";
import type { IPolicy } from "../../contracts/IPolicy.js";
import type { IResultContract } from "../../contracts/validation/IResultContract.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome.js";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator.js";
import type { IClock } from "../../contracts/runtime/IClock.js";
import type { IUsageLedgerStore } from "../../usage/IUsageLedgerStore.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import { zeroUsage } from "../../usage/zeroUsage.js";
import { ExecutionBoundaryGuard } from "../../execution-control/ExecutionBoundaryGuard.js";
import { AgentSessionError } from "../../errors/AgentSessionError.js";
import { DraftNotebook } from "./DraftNotebook.js";
import { AgentActionParser } from "./AgentActionParser.js";
export class AgenticSession<TResult> {
  private started = false;
  private readonly notebook = new DraftNotebook();
  private observation: JsonValue | null = null;
  private turn = 0;
  private readonly pending = new Set<string>();
  constructor(private readonly sessionId: string, private readonly maxTurns: number, private readonly model: IAgentTurn, private readonly tools: IAgentToolCall, private readonly parser: AgentActionParser, private readonly result: IResultContract<TResult>, private readonly acceptance: IPolicy<CompletionInput<TResult>, CompletionDecision>, private readonly journal: ISessionJournal, private readonly ledger: IUsageLedgerStore, private readonly budgetScopeId: string, private readonly ids: IIdGenerator, private readonly clock: IClock) {
    if (!sessionId || sessionId.length > 128 || !Number.isSafeInteger(maxTurns) || maxTurns < 1 || maxTurns > 128) throw new AgentSessionError();
  }
  async execute(context: IExecutionContext): Promise<ExecutionOutcome<TResult>> {
    if (this.started || context.identity.sessionId !== this.sessionId) throw new AgentSessionError();
    this.started = true;
    await this.journal.begin(this.view(), context);
    const guard = new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs);
    for (; this.turn < this.maxTurns; this.turn++) {
      const stop = guard.check(); if (stop !== null) return this.finish(this.stopped(stop.code, stop.message), context);
      const iteration = this.ids.nextId();
      const reservation = await this.ledger.mutate(ledger => ledger.reserve(iteration, this.budgetScopeId, { ...zeroUsage, iterations: 1 }));
      if (!reservation.admitted || reservation.replayed) return this.finish(this.stopped("limit-reached", "Iteration allowance unavailable."), context);
      await this.ledger.mutate(ledger => ledger.settle(iteration, { ...zeroUsage, iterations: 1 }));
      const modelContext = this.child(context);
      await this.mark(modelContext, "model");
      const reply = await this.model.run(this.view(), modelContext);
      if (reply.status === "uncertain") { this.pending.add(reply.operationId); for (const ref of reply.pendingOperationRefs ?? []) this.pending.add(ref); return this.finish(this.stopped("no-progress", "Operation requires reconciliation."), context); }
      await this.journal.resolved(modelContext.identity.operationId, reply.status === "text" ? { text: reply.text } : { stopped: reply.reason.code }, modelContext);
      this.pending.delete(modelContext.identity.operationId);
      if (reply.status === "stopped") return this.finish(this.stopped(reply.reason.code, reply.reason.message), context);
      const action = await this.parser.parse(reply.text);
      if (action === null) return this.finish(this.stopped("no-progress", "Invalid model action."), context);
      const after = guard.check(); if (after !== null) return this.finish(this.stopped(after.code, after.message), context);
      if (action.kind === "note") {
        if (!this.notebook.append(action.entry)) return this.finish(this.stopped("limit-reached", "Notebook capacity reached."), context);
        this.observation = { noteRecorded: true }; continue;
      }
      if (action.kind === "tool") {
        const toolContext = this.child(context); await this.mark(toolContext, "tool");
        const dispatched = await this.tools.dispatch({ operationId: toolContext.identity.operationId, toolId: action.toolId, arguments: action.arguments }, toolContext);
        if (dispatched.status === "uncertain") { this.pending.add(dispatched.operationId); return this.finish(this.stopped("no-progress", "Tool requires reconciliation."), context); }
        const observation: JsonValue = dispatched.status === "completed" ? { operationId: dispatched.observation.operationId, toolId: dispatched.observation.toolId, value: dispatched.observation.value } : dispatched.status === "rejected" ? { rejected: dispatched.code } : { stopped: dispatched.reason.code };
        await this.journal.resolved(toolContext.identity.operationId, observation, toolContext); this.pending.delete(toolContext.identity.operationId); this.observation = observation;
        if (dispatched.status === "stopped") return this.finish(this.stopped(dispatched.reason.code, dispatched.reason.message), context);
        continue;
      }
      const checked = await this.result.validate(action.value);
      if (!checked.valid) { this.observation = { correction: "Result schema rejected." }; continue; }
      const decision = await this.acceptance.apply({ candidate: checked.value, view: this.view() });
      const acceptedStop = guard.check(); if (acceptedStop !== null) return this.finish(this.stopped(acceptedStop.code, acceptedStop.message), context);
      if (decision.accepted) return this.finish({ status: "completed", result: checked.value }, context);
      this.observation = { correction: typeof decision.feedback === "string" ? decision.feedback.slice(0, 1024) : "Acceptance rejected." };
    }
    return this.finish(this.stopped("limit-reached", "Session turn limit reached."), context);
  }
  private view(): SessionView { return Object.freeze({ sessionId: this.sessionId, turn: this.turn, notebook: this.notebook.snapshot(), lastObservation: this.observation }); }
  private child(context: IExecutionContext): IExecutionContext { return Object.freeze({ ...context, identity: Object.freeze({ ...context.identity, operationId: this.ids.nextId(), parentOperationId: context.identity.operationId, sessionId: this.sessionId }) }); }
  private async mark(context: IExecutionContext, kind: "model" | "tool"): Promise<void> { this.pending.add(context.identity.operationId); await this.journal.pending(context.identity.operationId, kind, this.view(), context); }
  private stopped(code: "limit-reached" | "deadline-reached" | "cancelled" | "no-progress", message: string): ExecutionOutcome<TResult> {
    return { status: "stopped", reason: { code, message }, partial: { summary: this.notebook.snapshot().entries.map(entry => entry.text).join("\n"), evidenceRefs: [], artifactRefs: [], unresolved: ["Assignment acceptance is incomplete; inspect the session journal for observations and unverified evidence."] }, pendingOperationRefs: Object.freeze([...this.pending]) };
  }
  private async finish(outcome: ExecutionOutcome<TResult>, context: IExecutionContext): Promise<ExecutionOutcome<TResult>> { await this.journal.finish(this.view(), outcome, context); return outcome; }
}
