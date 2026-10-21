import type { IDebugEventSink } from "./IDebugEventSink.js";
import type { ITextLogWriter } from "./ITextLogWriter.js";
import type { DebugEvent } from "./DebugEvent.js";
export class JsonlDebugSink implements IDebugEventSink {
  constructor(private readonly writer: ITextLogWriter) {}
  send(event: DebugEvent, signal: AbortSignal): Promise<void> { return this.writer.write(JSON.stringify(event) + "\n", signal); }
}
