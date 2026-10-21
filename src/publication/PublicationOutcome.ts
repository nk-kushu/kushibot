import type { PublicationRecord } from "./PublicationRecord.js";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
export type PublicationOutcome=
 |Readonly<{status:"waiting-for-approval"|"blocked";code:string;record:PublicationRecord}>
 |Readonly<{status:"pending";record:PublicationRecord;pendingOperationRefs:readonly string[]}>
 |Readonly<{status:"recorded";record:PublicationRecord}>
 |Readonly<{status:"stopped";record:PublicationRecord;reason:ExecutionStopReason;pendingOperationRefs:readonly string[]}>;
