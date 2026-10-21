export type ModelUsage = Readonly<{ inputTokens: number; outputTokens: number; cachedInputTokens: number | null; reasoningTokens: number | null;
  cacheWriteTokens?: number | null; cacheWriteTtl30mTokens?: number | null; cacheWriteTtl12hTokens?: number | null }>;
