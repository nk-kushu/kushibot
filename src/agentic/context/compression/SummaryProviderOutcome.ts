import type { ExecutionStopReason } from "../../../execution-control/ExecutionStopReason.js";
export type SummaryProviderOutcome =
  | Readonly<{ status: "proposed"; value: unknown }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "stopped"; reason: ExecutionStopReason }>
  | Readonly<{ status: "uncertain"; operationId: string }>;
