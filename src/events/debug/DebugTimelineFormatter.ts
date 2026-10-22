import type { DebugEventPage } from "./DebugEventPage.js";
import { ConfigurationError } from "../../errors/ConfigurationError.js";
export class DebugTimelineFormatter {
  constructor(private readonly maxOutputBytes: number) {
    if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1) throw new ConfigurationError("Invalid timeline output bound.");
  }
  format(page: DebugEventPage): string {
    let output = "";
    for (const item of page.items) {
      const event = item.event;
      const line = `${item.sequence} ${new Date(event.occurredAtEpochMs).toISOString()} ${event.level} ${event.type} span=${event.trace.spanId} ${JSON.stringify(event.payload)}\n`;
      if (new TextEncoder().encode(output + line).byteLength > this.maxOutputBytes) throw new ConfigurationError("Timeline output exceeds limit; request a smaller page.");
      output += line;
    }
    return output;
  }
}
