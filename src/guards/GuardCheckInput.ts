import type { GuardTarget } from "./GuardTarget.js";
export type GuardCheckInput = Readonly<{ guardId: string; guardVersion: string; checkId: string; checkVersion: string; ruleIds: readonly string[]; target: GuardTarget }>;
