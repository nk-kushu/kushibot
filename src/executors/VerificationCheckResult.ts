export type VerificationCheckResult = Readonly<{ checkId: string; checkVersion: string; snapshotRef: string; status: "passed" | "failed"; receiptRef: string; summary: string }>;
