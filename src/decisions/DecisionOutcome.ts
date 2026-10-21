import type { DecisionAnswer } from "./DecisionAnswer.js";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
export type DecisionOutcome =
  | Readonly<{ status: "answered"; answer: Extract<DecisionAnswer, { kind: "answered" }> }>
  | Readonly<{ status: "abstained" }>
  | Readonly<{ status: "invalid-output"; code: string }>
  | Readonly<{ status: "unavailable"; code: string }>
  | Readonly<{ status: "stopped"; reason: ExecutionStopReason }>
  | Readonly<{ status: "uncertain"; operationId: string }>;
