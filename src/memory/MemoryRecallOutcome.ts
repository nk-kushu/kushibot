import type { MemoryRecallItem } from "./MemoryRecallItem.js";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
export type MemoryRecallOutcome=Readonly<{
 status:"ready"|"stopped";items:readonly MemoryRecallItem[];nextAfterId:string|null;
 skipped:readonly Readonly<{memoryId:string;code:"STALE_OR_UNSUPPORTED"}>[];reason:ExecutionStopReason|null;
}>;
