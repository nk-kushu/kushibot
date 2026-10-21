import type { GuardReport } from "./GuardReport.js";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
export type GuardRunOutcome = Readonly<{ report: GuardReport; stopReason: ExecutionStopReason | null }>;
