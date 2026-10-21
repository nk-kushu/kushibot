export type GuardFinding = Readonly<{ ruleId: string; verdict: "pass" | "fail" | "unknown"; evidenceRefs: readonly string[]; code: string }>;
