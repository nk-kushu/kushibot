import type { IScopedDebugRecorder } from "./IScopedDebugRecorder.js";
import type { ExecutionIdentity } from "../../contracts/runtime/ExecutionIdentity.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";

/** What one recorder reports on: its events carry this scope and identity. */
export type DebugRecorderTarget = Readonly<{ scope: ExecutionScopeRef; identity: ExecutionIdentity }>;

/** Creates a recorder with a fresh trace for each run; supplied by the host. */
export interface IScopedDebugRecorderFactory {
  create(target: DebugRecorderTarget): IScopedDebugRecorder;
}
