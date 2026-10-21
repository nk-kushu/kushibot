import type { ExecutionStopReason } from "../../execution-control/ExecutionStopReason.js";
export type AgentTurnOutcome = Readonly<{ status: "text"; text: string }> | Readonly<{ status: "stopped"; reason: ExecutionStopReason }> | Readonly<{ status: "uncertain"; operationId: string; pendingOperationRefs?: readonly string[] }>;
