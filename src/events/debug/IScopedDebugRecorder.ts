import type { DebugEventType } from "./DebugEventType.js";
import type { LogLevel } from "./LogLevel.js";
import type { TraceContext } from "./TraceContext.js";
import type { ExecutionIdentity } from "../../contracts/runtime/ExecutionIdentity.js";

export interface IScopedDebugRecorder {
  /** Records one event inside the innermost running `operation` span, or the run's root span. */
  event(type: DebugEventType, level: LogLevel, payload: unknown, trace?: TraceContext): string | null;
  /**
   * Records started/completed (or failed) around `work`; `details` joins the started payload.
   * Operations started inside `work` become child spans. `identity` (a step run's or session's
   * execution identity) is carried by this span's events and inherited by its children.
   */
  operation<TResult>(name: string, work: () => Promise<TResult>, details?: unknown, identity?: ExecutionIdentity): Promise<TResult>;
}
