import type { ModelUsage } from "../ModelUsage.js";
import type { PromptCacheUsageSummary } from "./PromptCacheUsageSummary.js";
import { PromptCacheConfigurationError } from "../../../errors/PromptCacheConfigurationError.js";
export class PromptCacheUsageAnalyzer {
  summarize(usage: ModelUsage | null): PromptCacheUsageSummary {
    if (usage === null) return { status: "unknown" };
    const cached = usage.cachedInputTokens, writes = usage.cacheWriteTokens ?? null;
    if (!Number.isSafeInteger(usage.inputTokens) || usage.inputTokens < 0 || !this.part(cached, usage.inputTokens) || !this.part(writes, usage.inputTokens)) throw new PromptCacheConfigurationError();
    return Object.freeze({ status: "measured", inputTokens: usage.inputTokens, cachedInputTokens: cached, cacheWriteTokens: writes,
      cachedInputFraction: cached === null || usage.inputTokens === 0 ? null : cached / usage.inputTokens });
  }
  private part(value: number | null, total: number): boolean { return value === null || (Number.isSafeInteger(value) && value >= 0 && value <= total); }
}
