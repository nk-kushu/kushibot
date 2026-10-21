import type { GuardSelection } from "./GuardSelection.js";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
export type GuardSelectionOutcome = Readonly<{ selection: GuardSelection; stopReason: ExecutionStopReason | null }>;
