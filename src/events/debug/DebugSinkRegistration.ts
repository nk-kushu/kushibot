import type { IDebugEventSink } from "./IDebugEventSink.js";

export type DebugSinkRegistration = Readonly<{ id: string; sink: IDebugEventSink }>;
