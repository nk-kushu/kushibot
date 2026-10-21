import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import type { NotebookEntry } from "./NotebookEntry.js";
export type AgentAction =
  | Readonly<{ kind: "note"; entry: NotebookEntry }>
  | Readonly<{ kind: "tool"; toolId: string; arguments: JsonValue }>
  | Readonly<{ kind: "final"; value: JsonValue }>;
