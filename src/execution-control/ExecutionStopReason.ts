import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
export type ExecutionStopReason = Extract<ExecutionOutcome<never>, { status: "stopped" }> ["reason"];
