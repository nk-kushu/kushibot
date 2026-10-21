import type { DebugEventType } from "./DebugEventType.js";
import type { LogLevel } from "./LogLevel.js";
import type { TraceContext } from "./TraceContext.js";

export interface IScopedDebugRecorder {
  event(type: DebugEventType, level: LogLevel, payload: unknown, trace?: TraceContext): string | null;
  operation<TResult>(name: string, work: () => Promise<TResult>): Promise<TResult>;
}
