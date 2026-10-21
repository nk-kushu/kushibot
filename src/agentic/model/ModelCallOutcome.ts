import type { ModelReply } from "./ModelReply.js";
import type { ExecutionStopReason } from "../../execution-control/ExecutionStopReason.js";
export type ModelCallOutcome =
  | Readonly<{ status: "received"; reply: ModelReply; stopReason: ExecutionStopReason | null }>
  | Readonly<{ status: "stopped"; reason: ExecutionStopReason }>
  | Readonly<{ status: "uncertain"; operationId: string }>;
