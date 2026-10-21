export type ModelCallControl = Readonly<{ operationId: string; signal: AbortSignal; deadlineEpochMs: number | null; timeoutMs: number }>;
