# 08. Debug Events and Tracing

## What We Implement Here

Create structured, sanitized debug events; runtime logging controls; scoped operation spans; bounded delivery; and saved timelines. Keep optional diagnostics best-effort, while committing required lifecycle events together with their state changes. Add an offline composition example and acceptance check.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `events/LogLevel.ts` | `type LogLevel` |
| `events/logLevelRanks.ts` | `const logLevelRanks` |
| `events/LoggingOptions.ts` | `type LoggingOptions` |
| `events/defaultLoggingOptions.ts` | `const defaultLoggingOptions` |
| `events/EnvironmentLoggingOptionsReader.ts` | `class EnvironmentLoggingOptionsReader` |
| `events/LoggingController.ts` | `class LoggingController` |
| `events/debugEventTypes.ts` | `const debugEventTypes` |
| `events/DebugEventType.ts` | `type DebugEventType` |
| `events/TraceContext.ts` | `type TraceContext` |
| `events/DebugPayload.ts` | `type DebugPayload` |
| `events/DebugEvent.ts` | `type DebugEvent` |
| `events/RecordedDebugEvent.ts` | `type RecordedDebugEvent` |
| `events/DebugEventPage.ts` | `type DebugEventPage` |
| `events/AppendDebugEventResult.ts` | `type AppendDebugEventResult` |
| `events/IDebugPayloadSanitizer.ts` | `interface IDebugPayloadSanitizer` |
| `events/DebugPayloadSanitizer.ts` | `class DebugPayloadSanitizer implements IDebugPayloadSanitizer` |
| `events/IMonotonicClock.ts` | `interface IMonotonicClock` |
| `events/PerformanceMonotonicClock.ts` | `class PerformanceMonotonicClock implements IMonotonicClock` |
| `events/DebugHealthCode.ts` | `type DebugHealthCode` |
| `events/IDebugHealthReporter.ts` | `interface IDebugHealthReporter` |
| `events/DebugHealthCounter.ts` | `class DebugHealthCounter implements IDebugHealthReporter` |
| `events/IDebugEventSink.ts` | `interface IDebugEventSink` |
| `events/DebugSinkRegistration.ts` | `type DebugSinkRegistration` |
| `events/BoundedDebugPublisher.ts` | `class BoundedDebugPublisher` |
| `events/DebugEventFactory.ts` | `class DebugEventFactory` |
| `events/IScopedDebugRecorder.ts` | `interface IScopedDebugRecorder` |
| `events/ScopedDebugRecorder.ts` | `class ScopedDebugRecorder implements IScopedDebugRecorder` |
| `events/ProgressDebugReporter.ts` | `class ProgressDebugReporter implements IExecutionReporter` |
| `events/DebugEventContract.ts` | `class DebugEventContract implements IResultContract<DebugEvent>` |
| `events/IDebugEventStore.ts` | `interface IDebugEventStore` |
| `events/ITransactionalDebugEventWriter.ts` | `interface ITransactionalDebugEventWriter` |
| `errors/DebugEventConflictError.ts` | `class DebugEventConflictError extends Error` |
| `events/DebugEventStatements.ts` | `type DebugEventStatements` |
| `events/sqliteDebugEventStatements.ts` | `const sqliteDebugEventStatements` |
| `events/postgresqlDebugEventStatements.ts` | `const postgresqlDebugEventStatements` |
| `events/SqlDebugEventStore.ts` | `class SqlDebugEventStore implements IDebugEventStore, ITransactionalDebugEventWriter` |
| `events/RequiredEventCommitResult.ts` | `type RequiredEventCommitResult<TValue>` |
| `events/RequiredLifecycleEventCommitter.ts` | `class RequiredLifecycleEventCommitter` |
| `events/StoredDebugEventSink.ts` | `class StoredDebugEventSink implements IDebugEventSink` |
| `events/ITextLogWriter.ts` | `interface ITextLogWriter` |
| `events/JsonlDebugSink.ts` | `class JsonlDebugSink implements IDebugEventSink` |
| `events/DebugTimelineFormatter.ts` | `class DebugTimelineFormatter` |
| `examples/debug-tracing/createDebugTracingExample.ts` | `function createDebugTracingExample` |
| `tests/events/checkDebugRecorder.ts` | `function checkDebugRecorder` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [page 01](01-scope-and-implementation-roadmap.md) and [page 02](02-package-structure-and-oop-conventions.md) for the shared OOP, naming, file, and writing rules. Each interface and class listed here has its own file. Existing contracts are imported, not redefined. This phase documents library code; it does not add model calls or an application CLI.
- `EnvironmentLoggingOptionsReader` reads only the injected startup snapshot. Missing environment keys preserve the host's base options; explicit values override them. Trim and normalize values, accept only `true`/`false` and the four levels, and reject invalid values. Never convert the string `"false"` with `Boolean(...)`.
- `LoggingController` governs optional diagnostics from all destinations. Capture its snapshot at emission. `setLevel()` does not enable disabled logging. Changes affect future emits; events already accepted into the queue drain under their original decision. Disablement neither cancels in-flight writes nor deletes saved history.
- All optional destinations use the same bounded publisher. Its capacity includes the current event. Each destination has a delivery timeout; a failed or timed-out destination is quarantined for the publisher's lifetime. Abort is cooperative: one ignored call may remain outstanding per quarantined destination, but later events do not start more calls there. `drain()` is for host shutdown/inspection, never a dependency of the task's result. A synchronous blocking sink cannot be interrupted by a JavaScript timer; adapters must use nonblocking I/O.
- Payload sanitization happens before queueing. Summaries are approved fixed messages; unknown fields, arbitrary prompts, model answers, source contents, error messages, credentials, and reasoning are excluded. Operation/state/code/identity/reference fields are trusted metadata, never a route for user text or secrets. Artifact references do not grant permission to read the artifacts. Custom sanitizers are trusted security implementations and must obey the same bounds. Event construction and SQL encoding both impose byte limits.
- Optional diagnostic capture/delivery failure must preserve the callback's exact return value or original thrown object. Record health through independent counters, never recursively through this logger. UTC time is for inspection; the injected monotonic clock measures local duration. A span left open after a crash stays open; do not invent completion.
- Trace ID groups a causal trace; span/parent-span IDs express nesting; causation event ID names a known predecessor. Receipt sequence orders a saved stream and does not prove causality or execution order. A start event may be absent because of level filtering, disabled logging, queue pressure, or a crash. `operation()` wraps one span; child recorders must receive explicit child trace contexts at the caller's composition boundary.
- `SqlDebugEventStore` binds one authenticated scope/project/workspace. Enforce authorization before providing this store to a caller. A stream is `run:<runId>` when present, otherwise `trace:<traceId>`. Bound reads, validate decoded events, and treat saved content as data. The database binding must normalize BIGINT values to safe JavaScript numbers and serialize a pinned transaction connection, as in page 06.
- The SQL profiles create fixed additive version-1 tables under `migrationTransaction()`'s cross-worker migration lock. The event envelope has its own schema version. Any incompatible table change requires an explicit migration and compatibility check before startup; `CREATE TABLE IF NOT EXISTS` alone is not a schema upgrade mechanism. Event IDs are unique within scope/project; exact canonical retries return the original receipt, while different content is rejected. Stream locking makes sequence allocation and insert atomic. Database failures still propagate from required persistence.
- Required lifecycle history is independent of optional logging. Use `RequiredLifecycleEventCommitter` to append a `state.persisted` event and perform a state mutation in the **same transaction**. The callback may perform only transaction-bound SQL through the supplied executor, including its optimistic revision check. If it fails, both the event and mutation roll back. Exact event retries skip the callback and return `applied: false`; reload authoritative state in that case. Preserve the same event ID and payload for an uncertain-commit retry.
- Calling the page-06 repository's public `save()` and then `append()` is not atomic. Its public method owns a separate transaction. Runtime state coordinators must expose a transaction-bound mutation path before using this committer; never nest `save()` inside the callback. The low-level `appendWithin()` is only for trusted persistence coordinators. The committer proves transaction atomicity, not that a caller's claimed state transition is semantically correct.
- Required usage records, approval decisions, checkpoints, and journals remain owned by their respective components. They are not replaced with optional diagnostics. Wire their future persistence coordinators to their own atomic contracts. No new configurable policy is introduced here; configurable policies elsewhere retain the shared `IPolicy<TInput, TOutput>` contract.
- `createDebugTracingExample()` is the composition example, not a hidden global container. The host owns the SQL connection, startup environment snapshot, ID generator, clocks, and destination lifecycle. Select the PostgreSQL SQL profile by injection for that backend. SQL initialization is explicit, and constructing the remaining services does not open connections.
- Acceptance checks must cover environment defaults/overrides/invalid values, severity thresholds and toggles, callback result/error preservation, sanitization, trace links and elapsed durations, queue saturation and quarantine, bounded timeline pages, duplicate-ID conflicts, scope isolation, restart reads, and lifecycle/state rollback. Run the persistence contract checks against real SQLite and PostgreSQL bindings before claiming both backends verified. No paid provider requests are needed.

## TypeScript Code for Each File

### `events/LogLevel.ts`

Defines the four supported diagnostic severity levels.

```typescript
export type LogLevel = "debug" | "info" | "warn" | "error";
```

### `events/logLevelRanks.ts`

Provides one authoritative minimum-severity ordering for validation and filtering.

```typescript
import type { LogLevel } from "./LogLevel";

export const logLevelRanks: Readonly<Record<LogLevel, number>> = Object.freeze({
  debug: 10, info: 20, warn: 30, error: 40,
});
```

### `events/LoggingOptions.ts`

Holds an immutable snapshot of optional logging enablement and severity threshold.

```typescript
import type { LogLevel } from "./LogLevel";

export type LoggingOptions = Readonly<{ enabled: boolean; level: LogLevel }>;
```

### `events/defaultLoggingOptions.ts`

Supplies enabled/info defaults only when the host has not supplied another logging configuration.

```typescript
import type { LoggingOptions } from "./LoggingOptions";

export const defaultLoggingOptions: LoggingOptions = Object.freeze({ enabled: true, level: "info" });
```

### `events/EnvironmentLoggingOptionsReader.ts`

Parses explicitly supplied KUSHIBOT_ environment values without reading process.env inside the framework.

```typescript
import type { LoggingOptions } from "./LoggingOptions";
import type { LogLevel } from "./LogLevel";
import { defaultLoggingOptions } from "./defaultLoggingOptions";
import { logLevelRanks } from "./logLevelRanks";
import { ConfigurationError } from "../errors/ConfigurationError";

export class EnvironmentLoggingOptionsReader {
  private readonly environment: Readonly<Record<string, string | undefined>>;
  constructor(environment: Readonly<Record<string, string | undefined>>) {
    this.environment = Object.freeze({ ...environment });
  }
  read(base: LoggingOptions = defaultLoggingOptions): LoggingOptions {
    let enabled = base.enabled;
    let level = base.level;
    const rawEnabled = this.environment.KUSHIBOT_LOG_ENABLED;
    const rawLevel = this.environment.KUSHIBOT_LOG_LEVEL;
    if (rawEnabled !== undefined) {
      const normalized = rawEnabled.trim().toLowerCase();
      if (normalized !== "true" && normalized !== "false") throw new ConfigurationError("Invalid KUSHIBOT_LOG_ENABLED.");
      enabled = normalized === "true";
    }
    if (rawLevel !== undefined) {
      const normalized = rawLevel.trim().toLowerCase();
      if (!Object.hasOwnProperty.call(logLevelRanks, normalized)) throw new ConfigurationError("Invalid KUSHIBOT_LOG_LEVEL.");
      level = normalized as LogLevel;
    }
    if (typeof enabled !== "boolean" || !Object.hasOwnProperty.call(logLevelRanks, level)) throw new ConfigurationError("Invalid base logging options.");
    return Object.freeze({ enabled, level });
  }
}
```

### `events/LoggingController.ts`

Changes future optional-emission decisions without deleting history or changing already accepted delivery work.

```typescript
import type { LoggingOptions } from "./LoggingOptions";
import type { LogLevel } from "./LogLevel";
import { logLevelRanks } from "./logLevelRanks";
import { ConfigurationError } from "../errors/ConfigurationError";

export class LoggingController {
  private options: LoggingOptions;
  constructor(options: LoggingOptions) {
    if (typeof options.enabled !== "boolean" || !Object.hasOwnProperty.call(logLevelRanks, options.level)) throw new ConfigurationError("Invalid logging options.");
    this.options = Object.freeze({ ...options });
  }
  snapshot(): LoggingOptions { return this.options; }
  setEnabled(enabled: boolean): void {
    if (typeof enabled !== "boolean") throw new ConfigurationError("Logging enabled must be boolean.");
    this.options = Object.freeze({ ...this.options, enabled });
  }
  setLevel(level: LogLevel): void {
    if (!Object.hasOwnProperty.call(logLevelRanks, level)) throw new ConfigurationError("Invalid logging level.");
    this.options = Object.freeze({ ...this.options, level });
  }
  allows(level: LogLevel, snapshot: LoggingOptions = this.options): boolean {
    return snapshot.enabled && logLevelRanks[level] >= logLevelRanks[snapshot.level];
  }
}
```

### `events/debugEventTypes.ts`

Lists the version-1 event vocabulary used by both TypeScript types and runtime validation.

```typescript
export const debugEventTypes = Object.freeze([
  "operation.started", "operation.completed", "operation.failed", "progress.reported",
  "policy.recommended", "policy.applied", "result.persisted", "cancellation.requested", "state.persisted",
] as const);
```

### `events/DebugEventType.ts`

Derives the event-name union from the authoritative event vocabulary.

```typescript
import type { debugEventTypes } from "./debugEventTypes";

export type DebugEventType = typeof debugEventTypes[number];
```

### `events/TraceContext.ts`

Connects spans and causation explicitly instead of inferring causality from timestamps or arrival order.

```typescript
export type TraceContext = Readonly<{
  traceId: string; spanId: string; parentSpanId: string | null; causationEventId: string | null;
}>;
```

### `events/DebugPayload.ts`

Defines bounded diagnostic fields; arbitrary prompts, outputs, credentials, and reasoning have no payload field.

```typescript
export type DebugPayload = Readonly<{
  operation?: string; summary?: string; code?: string;
  count?: number; durationMs?: number; revision?: number;
  previousState?: string; nextState?: string;
  relatedRefs?: readonly string[];
}>;
```

### `events/DebugEvent.ts`

Defines a versioned sanitized event envelope with scope, execution identity, trace, channel, and severity.

```typescript
import type { DebugEventType } from "./DebugEventType";
import type { LogLevel } from "./LogLevel";
import type { DebugPayload } from "./DebugPayload";
import type { TraceContext } from "./TraceContext";
import type { ExecutionIdentity } from "../contracts/runtime/ExecutionIdentity";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";

export type DebugEvent = Readonly<{
  schemaVersion: 1; eventId: string; channel: "diagnostic" | "lifecycle";
  type: DebugEventType; level: LogLevel; occurredAtEpochMs: number;
  producerId: string; scope: ExecutionScopeRef; identity: ExecutionIdentity;
  trace: TraceContext; payload: DebugPayload;
}>;
```

### `events/RecordedDebugEvent.ts`

Adds a store-assigned stream sequence and recorded timestamp to an event.

```typescript
import type { DebugEvent } from "./DebugEvent";

export type RecordedDebugEvent = Readonly<{ event: DebugEvent; sequence: number; recordedAtEpochMs: number }>;
```

### `events/DebugEventPage.ts`

Returns bounded timeline history with a continuation sequence when more saved events exist.

```typescript
import type { RecordedDebugEvent } from "./RecordedDebugEvent";

export type DebugEventPage = Readonly<{ items: readonly RecordedDebugEvent[]; nextSequence: number | null }>;
```

### `events/AppendDebugEventResult.ts`

Distinguishes a newly saved event from delivery of the exact same existing event ID and payload.

```typescript
import type { RecordedDebugEvent } from "./RecordedDebugEvent";

export type AppendDebugEventResult = Readonly<{ recorded: RecordedDebugEvent; replayed: boolean }>;
```

### `events/IDebugPayloadSanitizer.ts`

Defines a synchronous security boundary that returns only the permitted bounded payload shape.

```typescript
import type { DebugPayload } from "./DebugPayload";

export interface IDebugPayloadSanitizer {
  sanitize(value: unknown): DebugPayload;
}
```

### `events/DebugPayloadSanitizer.ts`

Drops unrecognized fields and permits free-text summaries only when they exactly match host-approved fixed messages.

```typescript
import type { DebugPayload } from "./DebugPayload";
import type { IDebugPayloadSanitizer } from "./IDebugPayloadSanitizer";
import { ConfigurationError } from "../errors/ConfigurationError";

export class DebugPayloadSanitizer implements IDebugPayloadSanitizer {
  private readonly summaries: ReadonlySet<string>;
  constructor(approvedSummaries: readonly string[] = []) {
    if (approvedSummaries.length > 100 || approvedSummaries.some(text => !this.text(text, 512))) {
      throw new ConfigurationError("Invalid debug summary allow-list.");
    }
    this.summaries = new Set(approvedSummaries);
  }
  sanitize(value: unknown): DebugPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return Object.freeze({});
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const result: {
      operation?: string; summary?: string; code?: string; count?: number; durationMs?: number;
      revision?: number; previousState?: string; nextState?: string; relatedRefs?: readonly string[];
    } = {};
    const operation = this.field(descriptors, "operation");
    if (typeof operation === "string" && /^[a-z][a-z0-9_.-]{0,127}$/.test(operation)) result.operation = operation;
    const summary = this.field(descriptors, "summary");
    if (typeof summary === "string" && this.summaries.has(summary)) result.summary = summary;
    const code = this.field(descriptors, "code");
    if (typeof code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(code)) result.code = code;
    for (const key of ["count", "revision"] as const) {
      const item = this.field(descriptors, key);
      if (typeof item === "number" && Number.isSafeInteger(item) && item >= 0) result[key] = item;
    }
    const duration = this.field(descriptors, "durationMs");
    if (typeof duration === "number" && Number.isFinite(duration) && duration >= 0) result.durationMs = duration;
    for (const key of ["previousState", "nextState"] as const) {
      const item = this.field(descriptors, key);
      if (typeof item === "string" && /^[a-z][a-z-]{0,63}$/.test(item)) result[key] = item;
    }
    const refs = this.field(descriptors, "relatedRefs");
    if (Array.isArray(refs) && refs.length <= 32 && refs.every(item => this.text(item, 256))) {
      result.relatedRefs = Object.freeze([...refs]);
    }
    return Object.freeze(result);
  }
  private field(descriptors: PropertyDescriptorMap, key: string): unknown {
    const descriptor = descriptors[key];
    return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined;
  }
  private text(value: unknown, maxBytes: number): value is string {
    return typeof value === "string" && value.length <= maxBytes && !/[\u0000-\u001f]/.test(value) &&
      new TextEncoder().encode(value).byteLength <= maxBytes;
  }
}
```

### `events/IMonotonicClock.ts`

Provides process-local elapsed-time measurements independently of UTC inspection timestamps.

```typescript
export interface IMonotonicClock { nowMs(): number; }
```

### `events/PerformanceMonotonicClock.ts`

Uses an injected performance clock without reading wall time for operation durations.

```typescript
import type { IMonotonicClock } from "./IMonotonicClock";

export class PerformanceMonotonicClock implements IMonotonicClock {
  constructor(private readonly performance: Pick<Performance, "now">) {}
  nowMs(): number { return this.performance.now(); }
}
```

### `events/DebugHealthCode.ts`

Defines finite independent counters for capture failures, queue pressure, and sink delivery problems.

```typescript
export type DebugHealthCode = "capture-failed" | "queue-full" | "delivery-failed" | "delivery-timeout" | "delivery-quarantined";
```

### `events/IDebugHealthReporter.ts`

Reports logging health without recursively sending an event to the failing diagnostic pipeline.

```typescript
import type { DebugHealthCode } from "./DebugHealthCode";

export interface IDebugHealthReporter { record(code: DebugHealthCode): void; }
```

### `events/DebugHealthCounter.ts`

Keeps bounded counter state only, without retaining raw event content or a growing list of failures.

```typescript
import type { IDebugHealthReporter } from "./IDebugHealthReporter";
import type { DebugHealthCode } from "./DebugHealthCode";

export class DebugHealthCounter implements IDebugHealthReporter {
  private readonly counts: Record<DebugHealthCode, number> = {
    "capture-failed": 0, "queue-full": 0, "delivery-failed": 0, "delivery-timeout": 0, "delivery-quarantined": 0,
  };
  record(code: DebugHealthCode): void { this.counts[code] = Math.min(Number.MAX_SAFE_INTEGER, this.counts[code] + 1); }
  snapshot(): Readonly<Record<DebugHealthCode, number>> { return Object.freeze({ ...this.counts }); }
}
```

### `events/IDebugEventSink.ts`

Defines cooperative, abort-aware delivery to one optional destination.

```typescript
import type { DebugEvent } from "./DebugEvent";

export interface IDebugEventSink { send(event: DebugEvent, signal: AbortSignal): Promise<void>; }
```

### `events/DebugSinkRegistration.ts`

Associates a stable destination ID with its injected sink implementation.

```typescript
import type { IDebugEventSink } from "./IDebugEventSink";

export type DebugSinkRegistration = Readonly<{ id: string; sink: IDebugEventSink }>;
```

### `events/BoundedDebugPublisher.ts`

Delivers sanitized events through a bounded queue, timing out and quarantining failing destinations without blocking task execution.

```typescript
import type { DebugEvent } from "./DebugEvent";
import type { DebugSinkRegistration } from "./DebugSinkRegistration";
import type { IDebugHealthReporter } from "./IDebugHealthReporter";
import type { DebugHealthCode } from "./DebugHealthCode";
import { ConfigurationError } from "../errors/ConfigurationError";

export class BoundedDebugPublisher {
  private readonly sinks: readonly DebugSinkRegistration[];
  private readonly queue: DebugEvent[] = [];
  private readonly quarantined = new Set<string>();
  private worker: Promise<void> | null = null;
  private active = false;
  constructor(sinks: readonly DebugSinkRegistration[], private readonly maxPending: number,
    private readonly timeoutMs: number, private readonly health: IDebugHealthReporter) {
    if (!Number.isSafeInteger(maxPending) || maxPending < 1 || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647 ||
        sinks.length > 32 || sinks.some(item => !/^[a-zA-Z0-9_.-]{1,64}$/.test(item.id)) ||
        new Set(sinks.map(item => item.id)).size !== sinks.length) throw new ConfigurationError("Invalid debug delivery bounds or registrations.");
    this.sinks = Object.freeze(sinks.map(item => Object.freeze({ ...item })));
  }
  tryPublish(event: DebugEvent): boolean {
    if (this.queue.length + Number(this.active) >= this.maxPending) { this.report("queue-full"); return false; }
    this.queue.push(event);
    this.start();
    return true;
  }
  async drain(): Promise<void> { while (this.worker !== null) await this.worker; }

  private start(): void {
    if (this.worker !== null) return;
    const worker = this.run().catch(() => {
      this.active = false; this.queue.length = 0; this.report("delivery-failed");
      for (const item of this.sinks) this.quarantined.add(item.id);
    });
    this.worker = worker;
    void worker.then(() => {
      this.worker = null;
      if (this.queue.length > 0) this.start();
    });
  }
  private async run(): Promise<void> {
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (event === undefined) break;
      this.active = true;
      for (const subscription of this.sinks) {
        if (this.quarantined.has(subscription.id)) { this.report("delivery-quarantined"); continue; }
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const delivery = Promise.resolve().then(() => subscription.sink.send(event, controller.signal)).then(
          () => "delivered" as const, () => "failed" as const,
        );
        const timeout = new Promise<"timeout">(resolve => { timer = setTimeout(() => resolve("timeout"), this.timeoutMs); });
        const result = await Promise.race([delivery, timeout]);
        if (timer !== undefined) clearTimeout(timer);
        if (result !== "delivered") {
          controller.abort();
          this.quarantined.add(subscription.id);
          this.report(result === "timeout" ? "delivery-timeout" : "delivery-failed");
        }
      }
      this.active = false;
    }
  }
  private report(code: DebugHealthCode): void {
    try { this.health.record(code); } catch { /* Optional health reporting cannot recurse or fail the task. */ }
  }
}
```

### `events/DebugEventFactory.ts`

Constructs immutable sanitized events from a bound scope, identity, trace, clock, and ID generator.

```typescript
import type { DebugEvent } from "./DebugEvent";
import type { DebugEventType } from "./DebugEventType";
import type { TraceContext } from "./TraceContext";
import type { LogLevel } from "./LogLevel";
import type { IDebugPayloadSanitizer } from "./IDebugPayloadSanitizer";
import type { IClock } from "../contracts/runtime/IClock";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import type { ExecutionIdentity } from "../contracts/runtime/ExecutionIdentity";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import { ConfigurationError } from "../errors/ConfigurationError";

export class DebugEventFactory {
  private readonly scope: ExecutionScopeRef;
  private readonly identity: ExecutionIdentity;
  constructor(scope: ExecutionScopeRef, identity: ExecutionIdentity, private readonly producerId: string,
    private readonly clock: IClock, private readonly ids: IIdGenerator, private readonly sanitizer: IDebugPayloadSanitizer, private readonly maxEventBytes = 16384) {
    this.scope = Object.freeze({ ...scope }); this.identity = Object.freeze({ ...identity });
  }
  create(channel: "diagnostic" | "lifecycle", type: DebugEventType, level: LogLevel, payload: unknown, trace: TraceContext): DebugEvent {
    if ((channel === "lifecycle") !== (type === "state.persisted")) throw new ConfigurationError("Lifecycle channel requires a state.persisted event.");
    const occurredAtEpochMs = this.clock.nowEpochMs();
    if (!Number.isSafeInteger(occurredAtEpochMs) || occurredAtEpochMs < 0 || occurredAtEpochMs > 8640000000000000) {
      throw new ConfigurationError("Invalid debug event timestamp.");
    }
    const event: DebugEvent = Object.freeze({ schemaVersion: 1, eventId: this.ids.nextId(), channel, type, level, occurredAtEpochMs,
      producerId: this.producerId, scope: this.scope, identity: this.identity,
      trace: Object.freeze({ ...trace }), payload: this.sanitizer.sanitize(payload) });
    if (!Number.isSafeInteger(this.maxEventBytes) || this.maxEventBytes < 1 || new TextEncoder().encode(JSON.stringify(event)).byteLength > this.maxEventBytes) {
      throw new ConfigurationError("Debug event exceeds its byte limit.");
    }
    return event;
  }
}
```

### `events/IScopedDebugRecorder.ts`

Defines optional event emission and operation wrapping without adding services to IExecutionContext.

```typescript
import type { DebugEventType } from "./DebugEventType";
import type { LogLevel } from "./LogLevel";
import type { TraceContext } from "./TraceContext";

export interface IScopedDebugRecorder {
  event(type: DebugEventType, level: LogLevel, payload: unknown, trace?: TraceContext): string | null;
  operation<TResult>(name: string, work: () => Promise<TResult>): Promise<TResult>;
}
```

### `events/ScopedDebugRecorder.ts`

Records sanitized spans best-effort while always returning the original callback result or rethrowing its original error.

```typescript
import type { IScopedDebugRecorder } from "./IScopedDebugRecorder";
import type { IMonotonicClock } from "./IMonotonicClock";
import type { IDebugHealthReporter } from "./IDebugHealthReporter";
import type { DebugEventType } from "./DebugEventType";
import type { TraceContext } from "./TraceContext";
import type { LogLevel } from "./LogLevel";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import { LoggingController } from "./LoggingController";
import { BoundedDebugPublisher } from "./BoundedDebugPublisher";
import { DebugEventFactory } from "./DebugEventFactory";

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
```

### `events/ProgressDebugReporter.ts`

Routes progress through the same recorder; only approved fixed summary messages survive sanitization.

```typescript
import type { IExecutionReporter } from "../executors/contracts/IExecutionReporter";
import type { IScopedDebugRecorder } from "./IScopedDebugRecorder";

export class ProgressDebugReporter implements IExecutionReporter {
  constructor(private readonly recorder: IScopedDebugRecorder) {}
  async progress(message: string): Promise<void> { this.recorder.event("progress.reported", "info", { summary: message }); }
}
```

### `events/DebugEventContract.ts`

Validates the event schema, identity, channel, trace, and bounded payload before event persistence or restoration.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { DebugEvent } from "./DebugEvent";
import { debugEventTypes } from "./debugEventTypes";
import { logLevelRanks } from "./logLevelRanks";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ExecutionIdentityContract } from "../contracts/runtime/ExecutionIdentityContract";

export class DebugEventContract implements IResultContract<DebugEvent> {
  readonly id = "debug-event";
  readonly version = "1";
  constructor(private readonly json: JsonValueContract, private readonly identities: ExecutionIdentityContract) {}
  async validate(value: unknown): Promise<ValidationResult<DebugEvent>> {
    const json = await this.json.validate(value);
    if (!json.valid || !this.record(json.value)) return this.invalid();
    const data = json.value;
    if (!this.exact(data, ["schemaVersion", "eventId", "channel", "type", "level", "occurredAtEpochMs", "producerId", "scope", "identity", "trace", "payload"]) ||
        data.schemaVersion !== 1 || !this.idValue(data.eventId) || !this.idValue(data.producerId) ||
        (data.channel !== "diagnostic" && data.channel !== "lifecycle") ||
        !debugEventTypes.some(type => type === data.type) || ((data.channel === "lifecycle") !== (data.type === "state.persisted")) ||
        typeof data.level !== "string" || !Object.hasOwnProperty.call(logLevelRanks, data.level) ||
        typeof data.occurredAtEpochMs !== "number" || !Number.isSafeInteger(data.occurredAtEpochMs) || data.occurredAtEpochMs < 0 || data.occurredAtEpochMs > 8640000000000000 ||
        !this.record(data.scope) || !this.idValue(data.scope.scopeId) || !this.idValue(data.scope.projectId) ||
        Object.keys(data.scope).some(key => !["scopeId", "projectId", "workspaceId"].includes(key)) ||
        ("workspaceId" in data.scope && !this.idValue(data.scope.workspaceId)) || !this.record(data.trace) ||
        !this.exact(data.trace, ["traceId", "spanId", "parentSpanId", "causationEventId"]) ||
        !this.idValue(data.trace.traceId) || !this.idValue(data.trace.spanId) ||
        !(data.trace.parentSpanId === null || this.idValue(data.trace.parentSpanId)) ||
        !(data.trace.causationEventId === null || this.idValue(data.trace.causationEventId)) ||
        data.trace.parentSpanId === data.trace.spanId || data.trace.causationEventId === data.eventId ||
        !this.payload(data.payload)) return this.invalid();
    if (!(await this.identities.validate(data.identity)).valid) return this.invalid();
    return { valid: true, value: data as DebugEvent };
  }
  private payload(value: unknown): boolean {
    if (!this.record(value) || Object.keys(value).some(key => !["operation", "summary", "code", "count", "durationMs", "revision", "previousState", "nextState", "relatedRefs"].includes(key))) return false;
    if ("operation" in value && (typeof value.operation !== "string" || !/^[a-z][a-z0-9_.-]{0,127}$/.test(value.operation))) return false;
    if ("summary" in value && !this.text(value.summary, 512)) return false;
    if ("code" in value && (typeof value.code !== "string" || !/^[A-Z][A-Z0-9_]{0,63}$/.test(value.code))) return false;
    for (const key of ["count", "revision"]) if (key in value && (typeof value[key] !== "number" || !Number.isSafeInteger(value[key]) || Number(value[key]) < 0)) return false;
    if ("durationMs" in value && (typeof value.durationMs !== "number" || !Number.isFinite(value.durationMs) || value.durationMs < 0)) return false;
    for (const key of ["previousState", "nextState"]) if (key in value && (typeof value[key] !== "string" || !/^[a-z][a-z-]{0,63}$/.test(String(value[key])))) return false;
    if ("relatedRefs" in value && (!Array.isArray(value.relatedRefs) || value.relatedRefs.length > 32 || !value.relatedRefs.every(item => this.text(item, 256)))) return false;
    return true;
  }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
  private idValue(value: unknown): value is string { return this.text(value, 256) && value.trim().length > 0; }
  private text(value: unknown, max: number): value is string {
    return typeof value === "string" && value.length <= max && !/[\u0000-\u001f]/.test(value) && new TextEncoder().encode(value).byteLength <= max;
  }
  private exact(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwnProperty.call(value, key)); }
  private invalid(): ValidationResult<DebugEvent> { return { valid: false, issues: [{ path: [], code: "invalid-debug-event", message: "Debug event is invalid or incompatible." }] }; }
}
```

### `events/IDebugEventStore.ts`

Appends optional diagnostic records and reads a scoped stream in bounded receipt order.

```typescript
import type { DebugEvent } from "./DebugEvent";
import type { AppendDebugEventResult } from "./AppendDebugEventResult";
import type { DebugEventPage } from "./DebugEventPage";
export interface IDebugEventStore {
  append(event: DebugEvent): Promise<AppendDebugEventResult>;
  read(streamId: string, afterSequence: number, limit: number): Promise<DebugEventPage>;
}
```

### `events/ITransactionalDebugEventWriter.ts`

Exposes transaction-bound append only to persistence coordinators; it must share the state-change transaction.

```typescript
import type { ISqlExecutor } from "../persistence/sql/ISqlExecutor";
import type { DebugEvent } from "./DebugEvent";
import type { AppendDebugEventResult } from "./AppendDebugEventResult";
export interface ITransactionalDebugEventWriter {
  appendWithin(transaction: ISqlExecutor, event: DebugEvent): Promise<AppendDebugEventResult>;
}
```

### `errors/DebugEventConflictError.ts`

Rejects reuse of a saved event ID with different content without exposing the stored payload.

```typescript
export class DebugEventConflictError extends Error {
  readonly code = "DEBUG_EVENT_CONFLICT";
  constructor() { super("Debug event ID already has different content."); this.name = "DebugEventConflictError"; }
}
```

### `events/DebugEventStatements.ts`

Carries backend-specific SQL as injected data; the store never branches on a database kind.

```typescript
export type DebugEventStatements = Readonly<{
  schema: readonly string[]; ensureStream: string; lockStream: string;
  find: string; counter: string; advance: string; insert: string; page: string;
}>;
```

### `events/sqliteDebugEventStatements.ts`

Defines the sqlite table and parameter syntax, with fixed identifiers and bound values.

```typescript
import type { DebugEventStatements } from "./DebugEventStatements";
export const sqliteDebugEventStatements: DebugEventStatements = Object.freeze({
  "schema": [
    "CREATE TABLE IF NOT EXISTS kushibot_debug_streams (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, stream_id TEXT NOT NULL, next_sequence BIGINT NOT NULL, PRIMARY KEY (scope_id, project_id, stream_id))",
    "CREATE TABLE IF NOT EXISTS kushibot_debug_events (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, event_id TEXT NOT NULL, stream_id TEXT NOT NULL, sequence BIGINT NOT NULL, recorded_at_epoch_ms BIGINT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, event_id), UNIQUE (scope_id, project_id, stream_id, sequence))"
  ],
  "ensureStream": "INSERT INTO kushibot_debug_streams (scope_id, project_id, stream_id, next_sequence) VALUES (?, ?, ?, 0) ON CONFLICT DO NOTHING",
  "lockStream": "UPDATE kushibot_debug_streams SET next_sequence = next_sequence WHERE scope_id = ? AND project_id = ? AND stream_id = ?",
  "find": "SELECT stream_id, sequence, recorded_at_epoch_ms, payload FROM kushibot_debug_events WHERE scope_id = ? AND project_id = ? AND event_id = ?",
  "counter": "SELECT next_sequence FROM kushibot_debug_streams WHERE scope_id = ? AND project_id = ? AND stream_id = ?",
  "advance": "UPDATE kushibot_debug_streams SET next_sequence = ? WHERE scope_id = ? AND project_id = ? AND stream_id = ?",
  "insert": "INSERT INTO kushibot_debug_events (scope_id, project_id, event_id, stream_id, sequence, recorded_at_epoch_ms, payload) VALUES (?, ?, ?, ?, ?, ?, ?)",
  "page": "SELECT stream_id, sequence, recorded_at_epoch_ms, payload FROM kushibot_debug_events WHERE scope_id = ? AND project_id = ? AND stream_id = ? AND sequence > ? ORDER BY sequence ASC LIMIT ?"
});
```

### `events/postgresqlDebugEventStatements.ts`

Defines the postgresql table and parameter syntax, with fixed identifiers and bound values.

```typescript
import type { DebugEventStatements } from "./DebugEventStatements";
export const postgresqlDebugEventStatements: DebugEventStatements = Object.freeze({
  "schema": [
    "CREATE TABLE IF NOT EXISTS kushibot_debug_streams (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, stream_id TEXT NOT NULL, next_sequence BIGINT NOT NULL, PRIMARY KEY (scope_id, project_id, stream_id))",
    "CREATE TABLE IF NOT EXISTS kushibot_debug_events (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, event_id TEXT NOT NULL, stream_id TEXT NOT NULL, sequence BIGINT NOT NULL, recorded_at_epoch_ms BIGINT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (scope_id, project_id, event_id), UNIQUE (scope_id, project_id, stream_id, sequence))"
  ],
  "ensureStream": "INSERT INTO kushibot_debug_streams (scope_id, project_id, stream_id, next_sequence) VALUES ($1, $2, $3, 0) ON CONFLICT DO NOTHING",
  "lockStream": "UPDATE kushibot_debug_streams SET next_sequence = next_sequence WHERE scope_id = $1 AND project_id = $2 AND stream_id = $3",
  "find": "SELECT stream_id, sequence, recorded_at_epoch_ms, payload FROM kushibot_debug_events WHERE scope_id = $1 AND project_id = $2 AND event_id = $3",
  "counter": "SELECT next_sequence FROM kushibot_debug_streams WHERE scope_id = $1 AND project_id = $2 AND stream_id = $3",
  "advance": "UPDATE kushibot_debug_streams SET next_sequence = $1 WHERE scope_id = $2 AND project_id = $3 AND stream_id = $4",
  "insert": "INSERT INTO kushibot_debug_events (scope_id, project_id, event_id, stream_id, sequence, recorded_at_epoch_ms, payload) VALUES ($1, $2, $3, $4, $5, $6, $7)",
  "page": "SELECT stream_id, sequence, recorded_at_epoch_ms, payload FROM kushibot_debug_events WHERE scope_id = $1 AND project_id = $2 AND stream_id = $3 AND sequence > $4 ORDER BY sequence ASC LIMIT $5"
});
```

### `events/SqlDebugEventStore.ts`

Persists immutable scoped events, deduplicates exact retries, and assigns stream receipt sequence inside the caller’s transaction.

```typescript
import type { IDebugEventStore } from "./IDebugEventStore";
import type { ITransactionalDebugEventWriter } from "./ITransactionalDebugEventWriter";
import type { DebugEventStatements } from "./DebugEventStatements";
import type { DebugEvent } from "./DebugEvent";
import type { RecordedDebugEvent } from "./RecordedDebugEvent";
import type { AppendDebugEventResult } from "./AppendDebugEventResult";
import type { DebugEventPage } from "./DebugEventPage";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import type { IClock } from "../contracts/runtime/IClock";
import type { IRecordCodec } from "../contracts/persistence/IRecordCodec";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase";
import type { ISqlExecutor } from "../persistence/sql/ISqlExecutor";
import { DebugEventConflictError } from "../errors/DebugEventConflictError";
import { ConfigurationError } from "../errors/ConfigurationError";

export class SqlDebugEventStore implements IDebugEventStore, ITransactionalDebugEventWriter {
  private readonly scope: ExecutionScopeRef;
  constructor(private readonly database: ISqlDatabase, private readonly sql: DebugEventStatements,
    scope: ExecutionScopeRef, private readonly codec: IRecordCodec<DebugEvent>, private readonly clock: IClock,
    private readonly maxPageSize: number) {
    this.scope = Object.freeze({ ...scope });
    if (!Number.isSafeInteger(maxPageSize) || maxPageSize < 1 || maxPageSize > 1000) throw new ConfigurationError("Invalid timeline page bound.");
  }
  async initialize(): Promise<void> {
    // Fixed additive v1 tables. Incompatible schema changes require a numbered migration, never IF NOT EXISTS alone.
    await this.database.migrationTransaction(async tx => { for (const statement of this.sql.schema) await tx.query(statement, []); });
  }
  append(event: DebugEvent): Promise<AppendDebugEventResult> {
    if (event.channel !== "diagnostic") return Promise.reject(new ConfigurationError("Lifecycle events require a state transaction."));
    return this.database.transaction(tx => this.appendWithin(tx, event));
  }
  async appendWithin(tx: ISqlExecutor, input: DebugEvent): Promise<AppendDebugEventResult> {
    const payload = await this.codec.encode(input);
    const event = await this.codec.decode(payload);
    this.checkScope(event);
    const stream = this.stream(event);
    const key = [this.scope.scopeId, this.scope.projectId, stream];
    await tx.query(this.sql.ensureStream, key);
    await tx.query(this.sql.lockStream, key);
    const existing = await tx.query(this.sql.find, [this.scope.scopeId, this.scope.projectId, event.eventId]);
    if (existing.rows.length > 0) {
      if (existing.rows[0].payload !== payload) throw new DebugEventConflictError();
      return { recorded: await this.restore(existing.rows[0], stream), replayed: true };
    }
    const counter = await tx.query(this.sql.counter, key);
    const previous = counter.rows[0]?.next_sequence;
    if (typeof previous !== "number" || !Number.isSafeInteger(previous) || previous < 0 || previous >= Number.MAX_SAFE_INTEGER) throw new ConfigurationError("Invalid stored debug sequence.");
    const sequence = previous + 1;
    const recordedAtEpochMs = this.clock.nowEpochMs();
    if (!Number.isSafeInteger(recordedAtEpochMs) || recordedAtEpochMs < 0 || recordedAtEpochMs > 8640000000000000) throw new ConfigurationError("Invalid recording timestamp.");
    await tx.query(this.sql.advance, [sequence, ...key]);
    await tx.query(this.sql.insert, [this.scope.scopeId, this.scope.projectId, event.eventId, stream, sequence, recordedAtEpochMs, payload]);
    return { recorded: Object.freeze({ event, sequence, recordedAtEpochMs }), replayed: false };
  }
  async read(streamId: string, afterSequence: number, limit: number): Promise<DebugEventPage> {
    if (!/^(run|trace):[^\u0000-\u001f]{1,256}$/.test(streamId) || !Number.isSafeInteger(afterSequence) || afterSequence < 0 ||
        !Number.isSafeInteger(limit) || limit < 1 || limit > this.maxPageSize) throw new ConfigurationError("Invalid timeline request.");
    const result = await this.database.query(this.sql.page, [this.scope.scopeId, this.scope.projectId, streamId, afterSequence, limit + 1]);
    const items: RecordedDebugEvent[] = [];
    for (const row of result.rows.slice(0, limit)) {
      const item = await this.restore(row, streamId);
      if (item.sequence <= (items.length ? items[items.length - 1].sequence : afterSequence)) throw new ConfigurationError("Invalid timeline ordering.");
      items.push(item);
    }
    return { items: Object.freeze(items), nextSequence: result.rows.length > limit ? items[items.length - 1].sequence : null };
  }
  private async restore(row: Readonly<Record<string, unknown>>, stream: string): Promise<RecordedDebugEvent> {
    if (typeof row.payload !== "string" || row.stream_id !== stream || typeof row.sequence !== "number" ||
        !Number.isSafeInteger(row.sequence) || row.sequence < 1 || typeof row.recorded_at_epoch_ms !== "number" ||
        !Number.isSafeInteger(row.recorded_at_epoch_ms) || row.recorded_at_epoch_ms < 0 || row.recorded_at_epoch_ms > 8640000000000000) throw new ConfigurationError("Invalid stored debug event.");
    const event = await this.codec.decode(row.payload);
    this.checkScope(event);
    if (this.stream(event) !== stream) throw new ConfigurationError("Stored stream does not match event.");
    return Object.freeze({ event, sequence: row.sequence, recordedAtEpochMs: row.recorded_at_epoch_ms });
  }
  private stream(event: DebugEvent): string { return event.identity.runId === undefined ? `trace:${event.trace.traceId}` : `run:${event.identity.runId}`; }
  private checkScope(event: DebugEvent): void {
    if (event.scope.scopeId !== this.scope.scopeId || event.scope.projectId !== this.scope.projectId || event.scope.workspaceId !== this.scope.workspaceId) throw new ConfigurationError("Debug scope mismatch.");
  }
}
```

### `events/RequiredEventCommitResult.ts`

Makes retries explicit: an already committed event has no newly computed callback result; the caller reloads authoritative state.

```typescript
import type { RecordedDebugEvent } from "./RecordedDebugEvent";
export type RequiredEventCommitResult<TValue> =
  | Readonly<{ applied: true; value: TValue; recorded: RecordedDebugEvent }>
  | Readonly<{ applied: false; recorded: RecordedDebugEvent }>;
```

### `events/RequiredLifecycleEventCommitter.ts`

Commits a required lifecycle event and transaction-bound state mutation together, skipping the mutation for exact retries.

```typescript
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase";
import type { ISqlExecutor } from "../persistence/sql/ISqlExecutor";
import type { ITransactionalDebugEventWriter } from "./ITransactionalDebugEventWriter";
import type { DebugEvent } from "./DebugEvent";
import type { RequiredEventCommitResult } from "./RequiredEventCommitResult";
import { ConfigurationError } from "../errors/ConfigurationError";
export class RequiredLifecycleEventCommitter {
  constructor(private readonly database: ISqlDatabase, private readonly writer: ITransactionalDebugEventWriter) {}
  commit<TValue>(event: DebugEvent, change: (tx: ISqlExecutor) => Promise<TValue>): Promise<RequiredEventCommitResult<TValue>> {
    if (event.channel !== "lifecycle" || event.type !== "state.persisted") return Promise.reject(new ConfigurationError("Required state event expected."));
    return this.database.transaction(async tx => {
      const saved = await this.writer.appendWithin(tx, event);
      if (saved.replayed) return { applied: false, recorded: saved.recorded };
      const value = await change(tx);
      return { applied: true, value, recorded: saved.recorded };
    });
  }
}
```

### `events/StoredDebugEventSink.ts`

Adapts optional database diagnostics to the bounded publisher; required lifecycle persistence uses its separate committer.

```typescript
import type { IDebugEventSink } from "./IDebugEventSink";
import type { IDebugEventStore } from "./IDebugEventStore";
import type { DebugEvent } from "./DebugEvent";
export class StoredDebugEventSink implements IDebugEventSink {
  constructor(private readonly store: IDebugEventStore) {}
  async send(event: DebugEvent, signal: AbortSignal): Promise<void> {
    if (signal.aborted) throw new Error("Diagnostic delivery cancelled.");
    await this.store.append(event);
  }
}
```

### `events/ITextLogWriter.ts`

Leaves console, file, or subscriber transport ownership with the host and supports cooperative cancellation.

```typescript
export interface ITextLogWriter { write(line: string, signal: AbortSignal): Promise<void>; }
```

### `events/JsonlDebugSink.ts`

Writes one sanitized event per JSON line through an injected destination.

```typescript
import type { IDebugEventSink } from "./IDebugEventSink";
import type { ITextLogWriter } from "./ITextLogWriter";
import type { DebugEvent } from "./DebugEvent";
export class JsonlDebugSink implements IDebugEventSink {
  constructor(private readonly writer: ITextLogWriter) {}
  send(event: DebugEvent, signal: AbortSignal): Promise<void> { return this.writer.write(JSON.stringify(event) + "\n", signal); }
}
```

### `events/DebugTimelineFormatter.ts`

Formats a bounded stored page with UTC timestamps, receipt sequence, span identity, and safe event data.

```typescript
import type { DebugEventPage } from "./DebugEventPage";
import { ConfigurationError } from "../errors/ConfigurationError";
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
```

### `examples/debug-tracing/createDebugTracingExample.ts`

Shows the host assembling SQLite tracing dependencies; substitute the PostgreSQL statement profile for that backend.

```typescript
import type { ISqlDatabase } from "../../persistence/sql/ISqlDatabase";
import type { IClock } from "../../contracts/runtime/IClock";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator";
import type { IMonotonicClock } from "../../events/IMonotonicClock";
import { LoggingController } from "../../events/LoggingController";
import { EnvironmentLoggingOptionsReader } from "../../events/EnvironmentLoggingOptionsReader";
import { DebugHealthCounter } from "../../events/DebugHealthCounter";
import { DebugPayloadSanitizer } from "../../events/DebugPayloadSanitizer";
import { DebugEventFactory } from "../../events/DebugEventFactory";
import { BoundedDebugPublisher } from "../../events/BoundedDebugPublisher";
import { ScopedDebugRecorder } from "../../events/ScopedDebugRecorder";
import { DebugEventContract } from "../../events/DebugEventContract";
import { SqlDebugEventStore } from "../../events/SqlDebugEventStore";
import { sqliteDebugEventStatements } from "../../events/sqliteDebugEventStatements";
import { StoredDebugEventSink } from "../../events/StoredDebugEventSink";
import { RequiredLifecycleEventCommitter } from "../../events/RequiredLifecycleEventCommitter";
import { JsonRecordCodec } from "../../persistence/JsonRecordCodec";
import { JsonValueContract } from "../../persistence/JsonValueContract";
import { ExecutionIdentityContract } from "../../contracts/runtime/ExecutionIdentityContract";

export async function createDebugTracingExample(database: ISqlDatabase, clock: IClock,
  ids: IIdGenerator, monotonic: IMonotonicClock, environment: Readonly<Record<string, string | undefined>>) {
  const scope = { scopeId: "demo-scope", projectId: "demo-project" };
  const identity = { operationId: "demo-operation", runId: "demo-run" };
  const trace = { traceId: ids.nextId(), spanId: ids.nextId(), parentSpanId: null, causationEventId: null };
  const logging = new LoggingController(new EnvironmentLoggingOptionsReader(environment).read({ enabled: true, level: "debug" }));
  const health = new DebugHealthCounter();
  const json = new JsonValueContract();
  const codec = new JsonRecordCodec(new DebugEventContract(json, new ExecutionIdentityContract()), json, 16384);
  const store = new SqlDebugEventStore(database, sqliteDebugEventStatements, scope, codec, clock, 100);
  await store.initialize();
  const publisher = new BoundedDebugPublisher([{ id: "database", sink: new StoredDebugEventSink(store) }], 128, 1000, health);
  const factory = new DebugEventFactory(scope, identity, "demo-worker", clock, ids, new DebugPayloadSanitizer(["Investigation started."]));
  const recorder = new ScopedDebugRecorder(logging, publisher, factory, trace, ids, monotonic, health);
  const required = new RequiredLifecycleEventCommitter(database, store);
  return { logging, health, publisher, factory, recorder, store, required, trace };
}
```

### `tests/events/checkDebugRecorder.ts`

Provides an offline acceptance check for preserved callback results/errors, runtime disabling, and safe payload filtering.

```typescript
import { ScopedDebugRecorder } from "../../events/ScopedDebugRecorder";
import { LoggingController } from "../../events/LoggingController";
import { BoundedDebugPublisher } from "../../events/BoundedDebugPublisher";
import { DebugEventFactory } from "../../events/DebugEventFactory";
import { DebugPayloadSanitizer } from "../../events/DebugPayloadSanitizer";
import { DebugHealthCounter } from "../../events/DebugHealthCounter";
import type { DebugEvent } from "../../events/DebugEvent";

export async function checkDebugRecorder(): Promise<void> {
  const events: DebugEvent[] = [];
  const logging = new LoggingController({ enabled: true, level: "debug" });
  const health = new DebugHealthCounter();
  const publisher = new BoundedDebugPublisher([{ id: "test", sink: { async send(event) { events.push(event); } } }], 8, 100, health);
  let id = 0;
  const ids = { nextId: () => `id-${++id}` };
  let elapsed = 0;
  const trace = { traceId: "trace", spanId: "root", parentSpanId: null, causationEventId: null };
  const factory = new DebugEventFactory({ scopeId: "scope", projectId: "project" }, { operationId: "operation" },
    "test", { nowEpochMs: () => 1000 }, ids, new DebugPayloadSanitizer());
  const recorder = new ScopedDebugRecorder(logging, publisher, factory, trace, ids, { nowMs: () => elapsed }, health);
  const expected = { secret: "must-not-be-logged" };
  const result = await recorder.operation("inspect", async () => { elapsed += 25; return expected; });
  if (result !== expected) throw new Error("Callback result changed.");
  await publisher.drain();
  if (events.length !== 2 || events[1].payload.durationMs !== 25 || events[1].trace.causationEventId !== events[0].eventId) throw new Error("Span correlation failed.");
  const original = new Error("private failure details");
  try { await recorder.operation("inspect", async () => { throw original; }); throw new Error("Missing failure."); }
  catch (error) { if (error !== original) throw new Error("Original error changed."); }
  await publisher.drain();
  recorder.event("progress.reported", "info", { summary: "private message", rawPrompt: "private prompt", password: "secret", count: 1 });
  await publisher.drain();
  const payload = events[events.length - 1].payload;
  if (JSON.stringify(payload) !== '{"count":1}' || JSON.stringify(events).includes("private")) throw new Error("Payload leakage.");
  logging.setEnabled(false);
  logging.setLevel("error");
  const before = events.length;
  let executed = false;
  await recorder.operation("inspect", async () => { executed = true; });
  await publisher.drain();
  if (!executed || events.length !== before || logging.snapshot().enabled) throw new Error("Disabled recorder changed work or emitted.");
}
```

### `index.ts`

Appends the tracing API to the existing package entry point; preserves exports from phases 03–07.

```typescript
export type { LogLevel } from "./events/LogLevel";
export { logLevelRanks } from "./events/logLevelRanks";
export type { LoggingOptions } from "./events/LoggingOptions";
export { defaultLoggingOptions } from "./events/defaultLoggingOptions";
export { EnvironmentLoggingOptionsReader } from "./events/EnvironmentLoggingOptionsReader";
export { LoggingController } from "./events/LoggingController";
export { debugEventTypes } from "./events/debugEventTypes";
export type { DebugEventType } from "./events/DebugEventType";
export type { TraceContext } from "./events/TraceContext";
export type { DebugPayload } from "./events/DebugPayload";
export type { DebugEvent } from "./events/DebugEvent";
export type { RecordedDebugEvent } from "./events/RecordedDebugEvent";
export type { DebugEventPage } from "./events/DebugEventPage";
export type { AppendDebugEventResult } from "./events/AppendDebugEventResult";
export type { IDebugPayloadSanitizer } from "./events/IDebugPayloadSanitizer";
export { DebugPayloadSanitizer } from "./events/DebugPayloadSanitizer";
export type { IMonotonicClock } from "./events/IMonotonicClock";
export { PerformanceMonotonicClock } from "./events/PerformanceMonotonicClock";
export type { DebugHealthCode } from "./events/DebugHealthCode";
export type { IDebugHealthReporter } from "./events/IDebugHealthReporter";
export { DebugHealthCounter } from "./events/DebugHealthCounter";
export type { IDebugEventSink } from "./events/IDebugEventSink";
export type { DebugSinkRegistration } from "./events/DebugSinkRegistration";
export { BoundedDebugPublisher } from "./events/BoundedDebugPublisher";
export { DebugEventFactory } from "./events/DebugEventFactory";
export type { IScopedDebugRecorder } from "./events/IScopedDebugRecorder";
export { ScopedDebugRecorder } from "./events/ScopedDebugRecorder";
export { ProgressDebugReporter } from "./events/ProgressDebugReporter";
export { DebugEventContract } from "./events/DebugEventContract";
export type { IDebugEventStore } from "./events/IDebugEventStore";
export type { ITransactionalDebugEventWriter } from "./events/ITransactionalDebugEventWriter";
export { DebugEventConflictError } from "./errors/DebugEventConflictError";
export type { DebugEventStatements } from "./events/DebugEventStatements";
export { sqliteDebugEventStatements } from "./events/sqliteDebugEventStatements";
export { postgresqlDebugEventStatements } from "./events/postgresqlDebugEventStatements";
export { SqlDebugEventStore } from "./events/SqlDebugEventStore";
export type { RequiredEventCommitResult } from "./events/RequiredEventCommitResult";
export { RequiredLifecycleEventCommitter } from "./events/RequiredLifecycleEventCommitter";
export { StoredDebugEventSink } from "./events/StoredDebugEventSink";
export type { ITextLogWriter } from "./events/ITextLogWriter";
export { JsonlDebugSink } from "./events/JsonlDebugSink";
export { DebugTimelineFormatter } from "./events/DebugTimelineFormatter";
```
