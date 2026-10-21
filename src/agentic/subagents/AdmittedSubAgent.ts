import type { SubAgentRequest } from "./SubAgentRequest.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
export type AdmittedSubAgent = Readonly<{
  childId: string; sessionId: string; operationId: string; budgetScopeId: string;
  parentSessionId: string; parentChildId: string | null; parentBudgetScopeId: string;
  depth: number; runId: string; scope: ExecutionScopeRef;
  request: SubAgentRequest;
}>;
