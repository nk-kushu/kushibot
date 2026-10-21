import type { ExecutionStopReason } from "./ExecutionStopReason.js";
export type ExecutionLimitDecision = Readonly<{ action: "stop"; reason: ExecutionStopReason }>;
