import type { DebugEventType } from "./DebugEventType.js";
import type { LogLevel } from "./LogLevel.js";
import type { DebugPayload } from "./DebugPayload.js";
import type { TraceContext } from "./TraceContext.js";
import type { ExecutionIdentity } from "../../contracts/runtime/ExecutionIdentity.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";

export type DebugEvent = Readonly<{
  schemaVersion: 1; eventId: string; channel: "diagnostic" | "lifecycle";
  type: DebugEventType; level: LogLevel; occurredAtEpochMs: number;
  producerId: string; scope: ExecutionScopeRef; identity: ExecutionIdentity;
  trace: TraceContext; payload: DebugPayload;
}>;
