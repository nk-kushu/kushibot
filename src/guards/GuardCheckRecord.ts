import type { GuardCheckResult } from "./GuardCheckResult.js";
export type GuardCheckRecord = Readonly<{ guardId: string; guardVersion: string; checkId: string; checkVersion: string; operationId: string;
  revisionRef: string; status: "completed" | "unavailable" | "uncertain"; result: GuardCheckResult | null }>;
