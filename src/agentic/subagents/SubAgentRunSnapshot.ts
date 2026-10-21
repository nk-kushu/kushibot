import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import type { SubAgentRecord } from "./SubAgentRecord.js";
export type SubAgentRunSnapshot = Readonly<{
  schemaVersion: 1; runId: string; rootSessionId: string; rootBudgetScopeId: string;
  scope: ExecutionScopeRef; maxChildren: number; maxDepth: number;
  records: readonly SubAgentRecord[];
}>;
