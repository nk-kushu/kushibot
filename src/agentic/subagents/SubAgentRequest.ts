import type { UsageAmounts } from "../../usage/UsageAmounts.js";
export type SubAgentRequest = Readonly<{
  goal: string; acceptanceCriteria: readonly string[]; sourceRefs: readonly string[];
  modelRole: string; resultContractId: string; toolIds: readonly string[];
  access: "read-only" | "edit"; filePaths: readonly string[];
  maxTurns: number; limits: UsageAmounts; deadlineEpochMs: number | null;
}>;
