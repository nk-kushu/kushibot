export type UsageAmounts = Readonly<{
  modelCalls: number; inputTokens: number; outputTokens: number;
  toolCalls: number; iterations: number; fixes: number;
}>;
