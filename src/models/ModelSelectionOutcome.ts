import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
export type ModelSelectionOutcome =
  | Readonly<{ kind: "selected"; profileId: string; policyId: string; policyVersion: string; reasonCode: string }>
  | Readonly<{ kind: "unavailable"; reasons: readonly string[] }>
  | Readonly<{ kind: "stopped"; reason: ExecutionStopReason }>
  | Readonly<{ kind: "uncertain"; operationId: string }>;
