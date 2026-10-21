import type { ComposedAgentContext } from "../../context/ComposedAgentContext.js";
import type { ExecutionStopReason } from "../../../execution-control/ExecutionStopReason.js";
export type PromptCachePreparedOutcome =
  | Readonly<{ status: "ready"; context: ComposedAgentContext }>
  | Readonly<{ status: "unsupported"; code: "PROMPT_CACHE_KEY_UNSUPPORTED" }>
  | Readonly<{ status: "limit-reached"; code: "CACHE_METADATA_EXCEEDS_REQUEST_LIMIT" }>
  | Readonly<{ status: "stopped"; reason: ExecutionStopReason }>;
