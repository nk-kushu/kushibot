import type { DebugEventType } from "./DebugEventType.js";
import type { LogLevel } from "./LogLevel.js";
import type { TraceContext } from "./TraceContext.js";

export interface IScopedDebugRecorder {
  event(type: DebugEventType, level: LogLevel, payload: unknown, trace?: TraceContext): string | null;
  /** Records started/completed (or failed) around `work`; `details` joins the started payload. */
  operation<TResult>(name: string, work: () => Promise<TResult>, details?: unknown): Promise<TResult>;
}
