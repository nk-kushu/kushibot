export type PromptCacheUsageSummary =
  | Readonly<{ status: "unknown" }>
  | Readonly<{ status: "measured"; inputTokens: number; cachedInputTokens: number | null; cacheWriteTokens: number | null; cachedInputFraction: number | null }>;
