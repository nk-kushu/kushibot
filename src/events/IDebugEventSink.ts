import type { DebugEvent } from "./DebugEvent.js";

export interface IDebugEventSink { send(event: DebugEvent, signal: AbortSignal): Promise<void>; }
