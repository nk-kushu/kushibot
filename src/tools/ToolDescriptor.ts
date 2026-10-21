import type { JsonValue } from "../contracts/persistence/JsonValue.js";
export type ToolDescriptor = Readonly<{ id: string; version: string; description: string; inputSchema: JsonValue; maxArgumentBytes: number; maxOutputBytes: number }>;
