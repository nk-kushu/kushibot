import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
import type { GuardReport } from "./GuardReport.js";
import type { GuardTarget } from "./GuardTarget.js";
export type GuardEnforcementInput = Readonly<{ report: GuardReport; stopReason: ExecutionStopReason | null; expectedTarget: GuardTarget }>;
