import type { IScopedDebugRecorder } from "./IScopedDebugRecorder.js";
import type { IMonotonicClock } from "./IMonotonicClock.js";
import type { IDebugHealthReporter } from "./IDebugHealthReporter.js";
import type { DebugEventType } from "./DebugEventType.js";
import type { TraceContext } from "./TraceContext.js";
import type { LogLevel } from "./LogLevel.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import { LoggingController } from "./LoggingController.js";
import { BoundedDebugPublisher } from "./BoundedDebugPublisher.js";
import { DebugEventFactory } from "./DebugEventFactory.js";

export class ScopedDebugRecorder implements IScopedDebugRecorder {
  private readonly trace: TraceContext;
  constructor(private readonly logging: LoggingController, private readonly publisher: BoundedDebugPublisher,
    private readonly factory: DebugEventFactory, trace: TraceContext, private readonly ids: IIdGenerator,
    private readonly monotonic: IMonotonicClock, private readonly health: IDebugHealthReporter) {
    this.trace = Object.freeze({ ...trace });
  }
  event(type: DebugEventType, level: LogLevel, payload: unknown, trace: TraceContext = this.trace): string | null {
    try {
      const options = this.logging.snapshot();
      if (!this.logging.allows(level, options)) return null;
      const event = this.factory.create("diagnostic", type, level, payload, trace);
      return this.publisher.tryPublish(event) ? event.eventId : null;
    } catch { this.captureFailed(); return null; }
  }
  async operation<TResult>(name: string, work: () => Promise<TResult>): Promise<TResult> {
    let span: Readonly<{ trace: TraceContext; started: number; startEventId: string | null }> | null = null;
    try {
      const trace: TraceContext = { traceId: this.trace.traceId, spanId: this.ids.nextId(), parentSpanId: this.trace.spanId, causationEventId: null };
      span = { trace, started: this.monotonic.nowMs(), startEventId: this.event("operation.started", "debug", { operation: name }, trace) };
    } catch { this.captureFailed(); }
    try {
      const result = await work();
      this.finish(name, span, false);
      return result;
    } catch (error: unknown) {
      this.finish(name, span, true);
      throw error;
    }
  }
  private finish(name: string, span: Readonly<{ trace: TraceContext; started: number; startEventId: string | null }> | null, failed: boolean): void {
    if (span === null) return;
    try {
      const durationMs = Math.max(0, this.monotonic.nowMs() - span.started);
      this.event(failed ? "operation.failed" : "operation.completed", failed ? "error" : "debug", {
        operation: name, durationMs, ...(failed ? { code: "OPERATION_FAILED" } : {}),
      }, { ...span.trace, causationEventId: span.startEventId });
    } catch { this.captureFailed(); }
  }
  private captureFailed(): void { try { this.health.record("capture-failed"); } catch { /* Independent best-effort health path. */ } }
}
