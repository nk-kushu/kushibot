import type { VerificationCheckResult } from "./VerificationCheckResult.js";
export type VerificationResult = Readonly<{ snapshotRef: string; passed: boolean; checks: readonly VerificationCheckResult[] }>;
