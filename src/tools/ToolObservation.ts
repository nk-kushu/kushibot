import type { JsonValue } from "../contracts/persistence/JsonValue.js";
export type ToolObservation = Readonly<{ operationId: string; toolId: string; toolVersion: string; value: JsonValue }>;
