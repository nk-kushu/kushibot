import type { ToolObservation } from "./ToolObservation.js";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
export type ToolDispatchOutcome =
  | Readonly<{ status: "completed"; observation: ToolObservation; replayed: boolean }>
  | Readonly<{ status: "rejected"; code: string }>
  | Readonly<{ status: "stopped"; reason: ExecutionStopReason }>
  | Readonly<{ status: "uncertain"; operationId: string }>;
