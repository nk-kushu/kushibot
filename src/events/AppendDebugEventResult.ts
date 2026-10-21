import type { RecordedDebugEvent } from "./RecordedDebugEvent.js";

export type AppendDebugEventResult = Readonly<{ recorded: RecordedDebugEvent; replayed: boolean }>;
