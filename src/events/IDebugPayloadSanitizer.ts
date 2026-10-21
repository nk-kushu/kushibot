import type { DebugPayload } from "./DebugPayload.js";

export interface IDebugPayloadSanitizer {
  sanitize(value: unknown): DebugPayload;
}
