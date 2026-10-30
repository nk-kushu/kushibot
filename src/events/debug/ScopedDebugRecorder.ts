import { AsyncLocalStorage } from "node:async_hooks";
import type { IScopedDebugRecorder } from "./IScopedDebugRecorder.js";
import type { IMonotonicClock } from "./IMonotonicClock.js";
import type { IDebugHealthReporter } from "./IDebugHealthReporter.js";
import type { DebugEventType } from "./DebugEventType.js";
import type { TraceContext } from "./TraceContext.js";
import type { LogLevel } from "./LogLevel.js";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator.js";
import type { ExecutionIdentity } from "../../contracts/runtime/ExecutionIdentity.js";
import { LoggingController } from "./LoggingController.js";
import { BoundedDebugPublisher } from "./BoundedDebugPublisher.js";
import { DebugEventFactory } from "./DebugEventFactory.js";

/** The operation span the current async call chain runs inside. */
type ActiveSpan = Readonly<{ trace: TraceContext; identity: ExecutionIdentity | undefined }>;

export class ScopedDebugRecorder implements IScopedDebugRecorder {
  private readonly trace: TraceContext;
  /** Nested `operation` calls parent to the enclosing one, so spans form a tree. */
  private readonly active = new AsyncLocalStorage<ActiveSpan>();
  constructor(private readonly logging: LoggingController, private readonly publisher: BoundedDebugPublisher,
    private readonly factory: DebugEventFactory, trace: TraceContext, private readonly ids: IIdGenerator,
    private readonly monotonic: IMonotonicClock, private readonly health: IDebugHealthReporter) {
    this.trace = Object.freeze({ ...trace });
  }
  event(type: DebugEventType, level: LogLevel, payload: unknown, trace?: TraceContext): string | null {
    const span = this.active.getStore();
    return this.emit(type, level, payload, trace ?? span?.trace ?? this.trace, span?.identity);
  }
  async operation<TResult>(name: string, work: () => Promise<TResult>, details?: unknown, identity?: ExecutionIdentity): Promise<TResult> {
    let span: Readonly<{ trace: TraceContext; identity: ExecutionIdentity | undefined; started: number; startEventId: string | null }> | null = null;
    const parent = this.active.getStore();
    try {
      const trace: TraceContext = { traceId: this.trace.traceId, spanId: this.ids.nextId(), parentSpanId: (parent?.trace ?? this.trace).spanId, causationEventId: null };
      const spanIdentity = identity ?? parent?.identity;
      span = { trace, identity: spanIdentity, started: this.monotonic.nowMs(),
        startEventId: this.emit("operation.started", "debug", { ...this.details(details), operation: name }, trace, spanIdentity) };
    } catch { this.captureFailed(); }
    const run = async (): Promise<TResult> => {
      try {
        const result = await work();
        this.finish(name, span, false);
        return result;
      } catch (error: unknown) {
        this.finish(name, span, true);
        throw error;
      }
    };
    return span === null ? run() : this.active.run({ trace: span.trace, identity: span.identity }, run);
  }
  private emit(type: DebugEventType, level: LogLevel, payload: unknown, trace: TraceContext, identity: ExecutionIdentity | undefined): string | null {
    try {
      const options = this.logging.snapshot();
      if (!this.logging.allows(level, options)) return null;
      const event = this.factory.create("diagnostic", type, level, payload, trace, identity);
      return this.publisher.tryPublish(event) ? event.eventId : null;
    } catch { this.captureFailed(); return null; }
  }
  private finish(name: string, span: Readonly<{ trace: TraceContext; identity: ExecutionIdentity | undefined; started: number; startEventId: string | null }> | null, failed: boolean): void {
    if (span === null) return;
    try {
      const durationMs = Math.max(0, this.monotonic.nowMs() - span.started);
      this.emit(failed ? "operation.failed" : "operation.completed", failed ? "error" : "debug", {
        operation: name, durationMs, ...(failed ? { code: "OPERATION_FAILED" } : {}),
      }, { ...span.trace, causationEventId: span.startEventId }, span.identity);
    } catch { this.captureFailed(); }
  }
  private details(value: unknown): object {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
  }
  private captureFailed(): void { try { this.health.record("capture-failed"); } catch { /* Independent best-effort health path. */ } }
}
