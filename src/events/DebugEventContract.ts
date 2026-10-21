import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { DebugEvent } from "./DebugEvent.js";
import { debugEventTypes } from "./debugEventTypes.js";
import { logLevelRanks } from "./logLevelRanks.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { ExecutionIdentityContract } from "../contracts/runtime/ExecutionIdentityContract.js";

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
