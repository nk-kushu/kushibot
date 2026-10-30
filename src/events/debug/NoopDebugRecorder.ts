import type { IScopedDebugRecorder } from "./IScopedDebugRecorder.js";

/** Records nothing; the default when a host configures no debug recording. */
export class NoopDebugRecorder implements IScopedDebugRecorder {
  event(): string | null { return null; }
  operation<TResult>(_name: string, work: () => Promise<TResult>, _details?: unknown, _identity?: unknown): Promise<TResult> { return work(); }
}
