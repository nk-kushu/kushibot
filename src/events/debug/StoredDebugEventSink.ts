import type { IDebugEventSink } from "./IDebugEventSink.js";
import type { IDebugEventStore } from "./IDebugEventStore.js";
import type { DebugEvent } from "./DebugEvent.js";
export class StoredDebugEventSink implements IDebugEventSink {
  constructor(private readonly store: IDebugEventStore) {}
  async send(event: DebugEvent, signal: AbortSignal): Promise<void> {
    if (signal.aborted) throw new Error("Diagnostic delivery cancelled.");
    await this.store.append(event);
  }
}
