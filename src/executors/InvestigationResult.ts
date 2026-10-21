export type InvestigationResult = Readonly<{ summary: string; findings: readonly Readonly<{ text: string; sourceRefs: readonly string[] }>[]; unresolved: readonly string[] }>;
