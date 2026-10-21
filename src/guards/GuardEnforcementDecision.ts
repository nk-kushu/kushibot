export type GuardEnforcementDecision = Readonly<{ action: "accept" | "request-fix" | "stop"; blockingRuleIds: readonly string[]; warningRuleIds: readonly string[]; reasonCodes: readonly string[] }>;
