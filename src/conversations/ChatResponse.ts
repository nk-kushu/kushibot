import type { JsonValue } from "../contracts/persistence/JsonValue.js";

/** Stable presentation envelope returned by an agent's chat entry point. */
export type ChatResponse<TResult extends JsonValue = JsonValue> = Readonly<{
  schemaVersion: 1;
  message: string;
  unresolved: readonly string[];
  result: TResult | null;
  presentation: "message" | "changes" | "structured";
}>;
