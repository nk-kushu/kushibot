import type { AdmittedSubAgent } from "./AdmittedSubAgent.js";
export function createSubAgentCommandKey(child: AdmittedSubAgent): string {
  const request = child.request;
  return JSON.stringify({ parentSessionId: child.parentSessionId, parentChildId: child.parentChildId, parentBudgetScopeId: child.parentBudgetScopeId,
    scope: { scopeId: child.scope.scopeId, projectId: child.scope.projectId, workspaceId: child.scope.workspaceId ?? null },
    request: { goal: request.goal, acceptanceCriteria: request.acceptanceCriteria, sourceRefs: request.sourceRefs, modelRole: request.modelRole, resultContractId: request.resultContractId, toolIds: request.toolIds, access: request.access, filePaths: request.filePaths, maxTurns: request.maxTurns, limits: { modelCalls: request.limits.modelCalls, inputTokens: request.limits.inputTokens, outputTokens: request.limits.outputTokens, toolCalls: request.limits.toolCalls, iterations: request.limits.iterations, fixes: request.limits.fixes }, deadlineEpochMs: request.deadlineEpochMs } });
}
