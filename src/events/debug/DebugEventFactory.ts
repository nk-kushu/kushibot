import type { DebugEvent } from "./DebugEvent.js";
import type { DebugEventType } from "./DebugEventType.js";
import type { TraceContext } from "./TraceContext.js";
import type { LogLevel } from "./LogLevel.js";
import type { IDebugPayloadSanitizer } from "./IDebugPayloadSanitizer.js";
import type { IClock } from "../../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator.js";
import type { ExecutionIdentity } from "../../contracts/runtime/ExecutionIdentity.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import { ConfigurationError } from "../../errors/ConfigurationError.js";

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
