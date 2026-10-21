import type { UsageAmounts } from "../../usage/UsageAmounts.js";
export type SubAgentAuthority = Readonly<{
  runId: string; parentSessionId: string; parentChildId: string | null;
  parentDepth: number; parentBudgetScopeId: string;
  canSpawn: boolean; canEdit: boolean; allowedToolIds: readonly string[];
  allowedModelRoles: readonly string[]; allowedResultContractIds: readonly string[];
  allowedFilePaths: readonly string[]; limits: UsageAmounts;
}>;
