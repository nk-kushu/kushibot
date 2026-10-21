import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { SessionView } from "./SessionView.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
export interface ISessionJournal {
  begin(view: SessionView, context: IExecutionContext): Promise<void>;
  pending(operationId: string, kind: "model" | "tool", view: SessionView, context: IExecutionContext): Promise<void>;
  resolved(operationId: string, observation: JsonValue, context: IExecutionContext): Promise<void>;
  finish(view: SessionView, outcome: unknown, context: IExecutionContext): Promise<void>;
}
