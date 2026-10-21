import type { GuardFinding } from "./GuardFinding.js";
export type GuardCheckResult = Readonly<{ revisionRef: string; findings: readonly GuardFinding[] }>;
