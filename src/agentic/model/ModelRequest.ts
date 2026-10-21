import type { ModelMessage } from "./ModelMessage.js";
export type ModelRequest = Readonly<{
  instructions: string; messages: readonly ModelMessage[]; maxOutputTokens: number;
  inputTokenUpperBound: number; promptCacheKey: string | null;
}>;
