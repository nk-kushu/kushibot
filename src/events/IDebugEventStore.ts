import type { DebugEvent } from "./DebugEvent.js";
import type { AppendDebugEventResult } from "./AppendDebugEventResult.js";
import type { DebugEventPage } from "./DebugEventPage.js";
export interface IDebugEventStore {
  append(event: DebugEvent): Promise<AppendDebugEventResult>;
  read(streamId: string, afterSequence: number, limit: number): Promise<DebugEventPage>;
}
