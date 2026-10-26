import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { IPolicy } from "../contracts/IPolicy.js";
import type { CompletionInput } from "../agentic/sessions/CompletionInput.js";
import type { CompletionDecision } from "../agentic/sessions/CompletionDecision.js";
import type { IAgentToolCall } from "../agentic/sessions/IAgentToolCall.js";

/** Application-supplied context and capabilities for one model session. */
export interface AgentSessionBinding<TResult> {
  readonly instructions: string;
  readonly input: JsonValue;
  readonly tools: IAgentToolCall;
  readonly acceptance: IPolicy<CompletionInput<TResult>, CompletionDecision>;
}
