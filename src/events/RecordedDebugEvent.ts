import type { DebugEvent } from "./DebugEvent.js";

export type RecordedDebugEvent = Readonly<{ event: DebugEvent; sequence: number; recordedAtEpochMs: number }>;
