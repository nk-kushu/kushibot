import type { DebugPayload } from "./DebugPayload.js";
import type { IDebugPayloadSanitizer } from "./IDebugPayloadSanitizer.js";
import { ConfigurationError } from "../../errors/ConfigurationError.js";

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
