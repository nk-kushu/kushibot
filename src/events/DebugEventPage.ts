import type { RecordedDebugEvent } from "./RecordedDebugEvent.js";

export type DebugEventPage = Readonly<{ items: readonly RecordedDebugEvent[]; nextSequence: number | null }>;
