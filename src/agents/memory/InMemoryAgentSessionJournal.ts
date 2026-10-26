import type { ISessionJournal } from "../../agentic/sessions/ISessionJournal.js";
import type { SessionView } from "../../agentic/sessions/SessionView.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";

export class InMemoryAgentSessionJournal implements ISessionJournal {
  private readonly entries: unknown[] = [];
  async begin(view: SessionView, context: IExecutionContext): Promise<void> {
    this.record("begin", context, view);
  }
  async pending(
    operationId: string,
    kind: "model" | "tool",
    view: SessionView,
    context: IExecutionContext,
  ): Promise<void> {
    this.record("pending", context, { operationId, kind, view });
  }
  async resolved(
    operationId: string,
    observation: JsonValue,
    context: IExecutionContext,
  ): Promise<void> {
    this.record("resolved", context, { operationId, observation });
  }
  async finish(view: SessionView, outcome: unknown, context: IExecutionContext): Promise<void> {
    this.record("finish", context, { view, outcome });
  }
  snapshot(): readonly unknown[] {
    return structuredClone(this.entries);
  }
  private record(kind: string, context: IExecutionContext, data: unknown): void {
    this.entries.push(structuredClone({ kind, identity: context.identity, data }));
  }
}
