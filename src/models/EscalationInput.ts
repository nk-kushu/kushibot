export type EscalationInput = Readonly<{ consecutiveFailures: number; escalationsUsed: number; failedCheckRefs: readonly string[]; pendingOperationRefs: readonly string[] }>;
