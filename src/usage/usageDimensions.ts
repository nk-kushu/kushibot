import type { UsageAmounts } from "./UsageAmounts.js";
export const usageDimensions: readonly (keyof UsageAmounts)[] = Object.freeze([
  "modelCalls", "inputTokens", "outputTokens", "toolCalls", "iterations", "fixes",
]);
