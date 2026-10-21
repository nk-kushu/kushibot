export type ModelProfile = Readonly<{
  id: string; providerId: string; modelId: string; contextTokens: number; maxOutputTokens: number;
  maxRequestBytes: number; maxResponseBytes: number; supportsPromptCacheKey: boolean;
}>;
