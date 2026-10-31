import type { IScopedDebugRecorder } from "./IScopedDebugRecorder.js";

/** Captures JSON in bounded, ordered chunks so requests fit the event transport. */
export class DebugContentRecorder {
  constructor(private readonly debug: IScopedDebugRecorder) {}
  record(stage: string, value: unknown): void {
    try {
      const content = JSON.stringify(value);
      if (content === undefined) return;
      const parts = Math.ceil(content.length / 1000);
      for (let index = 0; index < parts; index++) {
        const recorded = this.debug.event("progress.reported", "debug", {
          operation: `detail.${stage}`,
          content: content.slice(index * 1000, (index + 1) * 1000),
          count: index,
          metrics: { parts },
        });
        if (recorded === null) break;
      }
    } catch { /* Diagnostics must not change execution behavior. */ }
  }
}
