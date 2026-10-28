import type { IScopedDebugRecorder } from "./IScopedDebugRecorder.js";
import type { DebugRecorderTarget, IScopedDebugRecorderFactory } from "./IScopedDebugRecorderFactory.js";
import type { IDebugPayloadSanitizer } from "./IDebugPayloadSanitizer.js";
import type { IMonotonicClock } from "./IMonotonicClock.js";
import type { IDebugHealthReporter } from "./IDebugHealthReporter.js";
import type { IClock } from "../../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator.js";
import { LoggingController } from "./LoggingController.js";
import { BoundedDebugPublisher } from "./BoundedDebugPublisher.js";
import { DebugEventFactory } from "./DebugEventFactory.js";
import { ScopedDebugRecorder } from "./ScopedDebugRecorder.js";
import { DebugPayloadSanitizer } from "./DebugPayloadSanitizer.js";
import { PerformanceMonotonicClock } from "./PerformanceMonotonicClock.js";
import { DebugHealthCounter } from "./DebugHealthCounter.js";
import { SystemClock } from "../../runtime/SystemClock.js";

export type ScopedDebugRecorderFactoryOptions = Readonly<{
  logging: LoggingController;
  publisher: BoundedDebugPublisher;
  producerId: string;
  sanitizer?: IDebugPayloadSanitizer;
  clock?: IClock;
  ids?: IIdGenerator;
  monotonic?: IMonotonicClock;
  health?: IDebugHealthReporter;
  maxEventBytes?: number;
}>;

/** Builds one ScopedDebugRecorder per run, each rooted in a new trace, over shared delivery. */
export class ScopedDebugRecorderFactory implements IScopedDebugRecorderFactory {
  private readonly options: ScopedDebugRecorderFactoryOptions;
  private readonly ids: IIdGenerator;
  private readonly health: IDebugHealthReporter;
  constructor(options: ScopedDebugRecorderFactoryOptions) {
    this.options = Object.freeze({ ...options });
    this.ids = options.ids ?? { nextId: () => crypto.randomUUID() };
    this.health = options.health ?? new DebugHealthCounter();
  }
  create(target: DebugRecorderTarget): IScopedDebugRecorder {
    const { logging, publisher, producerId } = this.options;
    const events = new DebugEventFactory(target.scope, target.identity, producerId, this.options.clock ?? new SystemClock(),
      this.ids, this.options.sanitizer ?? new DebugPayloadSanitizer(), this.options.maxEventBytes);
    const trace = { traceId: this.ids.nextId(), spanId: this.ids.nextId(), parentSpanId: null, causationEventId: null };
    return new ScopedDebugRecorder(logging, publisher, events, trace, this.ids,
      this.options.monotonic ?? new PerformanceMonotonicClock(performance), this.health);
  }
}
