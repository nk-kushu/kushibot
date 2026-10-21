import type { ModelUsage } from "../ModelUsage.js";
export class OpenAiPromptCacheUsageMapper {
  map(value: unknown): ModelUsage | null {
    if (!this.record(value) || !this.count(value.input_tokens) || !this.count(value.output_tokens)) return null;
    const input = this.record(value.input_tokens_details) ? value.input_tokens_details : {};
    const output = this.record(value.output_tokens_details) ? value.output_tokens_details : {};
    const cached = input.cached_tokens ?? null, writes = input.cache_write_tokens ?? null, reasoning = output.reasoning_tokens ?? null;
    if (!this.optional(cached, value.input_tokens) || !this.optional(writes, value.input_tokens) || !this.optional(reasoning, value.output_tokens) ||
        (typeof cached === "number" && typeof writes === "number" && cached > value.input_tokens - writes)) return null;
    let short: number | null = null, long: number | null = null;
    if (input.cache_write_tokens_details !== undefined && input.cache_write_tokens_details !== null) {
      if (!this.record(input.cache_write_tokens_details) || !this.count(input.cache_write_tokens_details.ttl_30m_tokens) || !this.count(input.cache_write_tokens_details.ttl_12h_tokens) || typeof writes !== "number") return null;
      short = input.cache_write_tokens_details.ttl_30m_tokens; long = input.cache_write_tokens_details.ttl_12h_tokens;
      if (short > writes || long !== writes - short) return null;
    }
    return Object.freeze({ inputTokens: value.input_tokens, outputTokens: value.output_tokens, cachedInputTokens: cached as number | null,
      reasoningTokens: reasoning as number | null, cacheWriteTokens: writes as number | null, cacheWriteTtl30mTokens: short, cacheWriteTtl12hTokens: long });
  }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
  private count(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
  private optional(value: unknown, total: number): boolean { return value === null || (this.count(value) && value <= total); }
}
