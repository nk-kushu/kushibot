import { OpenAiPromptCacheUsageMapper } from "../../src/agentic/model/openai/OpenAiPromptCacheUsageMapper.js";
import { PromptCacheUsageAnalyzer } from "../../src/agentic/model/prompt-cache/PromptCacheUsageAnalyzer.js";
export function checkPromptCacheUsage(): void {
  const mapper = new OpenAiPromptCacheUsageMapper();
  const usage = mapper.map({ input_tokens: 1000, output_tokens: 100, input_tokens_details: { cached_tokens: 300, cache_write_tokens: 400, cache_write_tokens_details: { ttl_30m_tokens: 100, ttl_12h_tokens: 300 } }, output_tokens_details: { reasoning_tokens: 20 } });
  if (usage === null || usage.inputTokens !== 1000 || usage.cachedInputTokens !== 300 || usage.cacheWriteTokens !== 400 || usage.cacheWriteTtl12hTokens !== 300 || usage.outputTokens !== 100) throw new Error("Cache categories altered totals.");
  const summary = new PromptCacheUsageAnalyzer().summarize(usage);
  if (summary.status !== "measured" || summary.cachedInputFraction !== 0.3) throw new Error("Measured fraction invalid.");
  const unknown = mapper.map({ input_tokens: 1000, output_tokens: 100 });
  if (unknown?.cachedInputTokens !== null || unknown.cacheWriteTokens !== null) throw new Error("Absent categories became zero.");
  if (mapper.map({ input_tokens: 100, output_tokens: 10, input_tokens_details: { cached_tokens: 80, cache_write_tokens: 40 } }) !== null) throw new Error("Overlapping impossible categories accepted.");
  if (mapper.map({ input_tokens: 100, output_tokens: 10, input_tokens_details: { cache_write_tokens: 50, cache_write_tokens_details: { ttl_30m_tokens: 30, ttl_12h_tokens: 30 } } }) !== null) throw new Error("Invalid write breakdown accepted.");
}
