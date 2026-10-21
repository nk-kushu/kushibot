import type { ModelRoutingDecision } from "./ModelRoutingDecision.js";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
export type ModelRoutingOutcome =
  | Readonly<{ kind: "selected"; decision: ModelRoutingDecision }>
  | Readonly<{ kind: "unavailable"; reasons: readonly string[] }>
  | Readonly<{ kind: "stopped"; reason: ExecutionStopReason }>
  | Readonly<{ kind: "uncertain"; operationId: string }>;
