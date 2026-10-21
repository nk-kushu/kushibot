import type { ComposedAgentContext } from "./ComposedAgentContext.js";
import type { ExecutionStopReason } from "../../execution-control/ExecutionStopReason.js";
export type ContextCompositionOutcome =
  | Readonly<{ status: "ready"; context: ComposedAgentContext }>
  | Readonly<{ status: "limit-reached"; code: "REQUIRED_CONTEXT_TOO_LARGE" }>
  | Readonly<{ status: "unverified"; code: "CONTEXT_SNAPSHOT_UNVERIFIED" }>
  | Readonly<{ status: "stopped"; reason: ExecutionStopReason }>;
