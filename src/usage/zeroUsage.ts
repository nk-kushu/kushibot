import type { UsageAmounts } from "./UsageAmounts.js";
export const zeroUsage: UsageAmounts = Object.freeze({ modelCalls: 0, inputTokens: 0, outputTokens: 0, toolCalls: 0, iterations: 0, fixes: 0 });
