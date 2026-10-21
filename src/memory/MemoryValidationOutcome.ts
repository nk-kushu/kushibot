import type { MemoryRecord } from "./MemoryRecord.js";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
export type MemoryValidationOutcome=
 |Readonly<{status:"recorded";record:MemoryRecord}>
 |Readonly<{status:"stopped";reason:ExecutionStopReason;record:MemoryRecord}>
 |Readonly<{status:"changed";record:MemoryRecord}>;
