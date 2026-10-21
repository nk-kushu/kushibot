import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
export type DecisionProviderResult =
  | Readonly<{ status: "output"; value: unknown }>
  | Readonly<{ status: "invalid-output" }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "stopped"; reason: ExecutionStopReason }>
  | Readonly<{ status: "uncertain"; operationId: string }>;
