import type { SubAgentRunSnapshot } from "./SubAgentRunSnapshot.js";
import type { SubAgentRecord } from "./SubAgentRecord.js";
import type { SubAgentClaim } from "./SubAgentClaim.js";
import type { SubAgentClaimOutcome } from "./SubAgentClaimOutcome.js";
import type { AdmittedSubAgent } from "./AdmittedSubAgent.js";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import { usageDimensions } from "../../usage/usageDimensions.js";
import { createSubAgentCommandKey } from "./createSubAgentCommandKey.js";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError.js";
export class SubAgentState {
  private readonly records: SubAgentRecord[];
  constructor(private readonly initial: SubAgentRunSnapshot) {
    if (initial.schemaVersion !== 1 ||
        !Number.isSafeInteger(initial.maxChildren) ||
        initial.maxChildren < 0 ||
        initial.maxChildren > 64 ||
        !Number.isSafeInteger(initial.maxDepth) ||
        initial.maxDepth < 0 ||
        initial.maxDepth > 8 ||
        initial.records.length > initial.maxChildren) this.invalid();
    this.records = [];
    for (const record of initial.records) {
      this.validateCandidate(record.claim);
      if (this.records.some(old => old.claim.commandId === record.claim.commandId ||
        this.ids(old.claim.candidate).some(id => this.ids(record.claim.candidate).includes(id)))) this.invalid();
      this.records.push(record);
    }
    const open = this.records.filter(record => this.open(record));
    for (const record of open) {
      const ancestors = this.ancestors(record.claim.candidate.parentChildId);
      if (ancestors.some(parent => !this.open(parent))) this.invalid();
      if (open.some(other => other !== record && !ancestors.includes(other) && !this.ancestors(other.claim.candidate.parentChildId).includes(record))) this.invalid();
    }
  }
  claim(input: SubAgentClaim): SubAgentClaimOutcome {
    const old = this.records.find(record => record.claim.commandId === input.commandId);
    if (old !== undefined) {
      if (old.claim.requestKey !== input.requestKey) this.invalid();
      const child = old.claim.candidate;
      return { status: "existing", response: old.outcome === null ? { status: "pending", childId: child.childId, pendingOperationRefs: [child.operationId] } : { status: "returned", childId: child.childId, sessionId: child.sessionId, outcome: old.outcome } };
    }
    if (this.records.length >= this.initial.maxChildren) return { status: "rejected", code: "CHILD_COUNT_LIMIT" };
    if (input.candidate.depth > this.initial.maxDepth) return { status: "rejected", code: "CHILD_DEPTH_LIMIT" };
    this.validateCandidate(input);
    const ancestors = this.ancestors(input.candidate.parentChildId);
    if (ancestors.some(parent => parent.outcome !== null) ||
        this.records.some(record => this.open(record) && !ancestors.includes(record))) return { status: "rejected", code: "SEQUENTIAL_CHILD_BUSY" };
    if (this.records.some(record => this.ids(record.claim.candidate).some(id => this.ids(input.candidate).includes(id)))) this.invalid();
    this.records.push(Object.freeze({ claim: input, outcome: null }));
    return { status: "admitted", child: input.candidate };
  }
  complete(childId: string, outcome: ExecutionOutcome<JsonValue>): void {
    const index = this.records.findIndex(record => record.claim.candidate.childId === childId); if (index < 0) this.invalid();
    const old = this.records[index];
    if (old.outcome !== null) { if (this.canonical(old.outcome) !== this.canonical(outcome)) this.invalid(); return; }
    const unresolvedChildren = this.records.filter(record => this.open(record) && this.ancestors(record.claim.candidate.parentChildId).includes(old));
    if (unresolvedChildren.length > 0 && (outcome.status === "completed" || outcome.pendingOperationRefs.length === 0)) this.invalid();
    this.records[index] = Object.freeze({ claim: old.claim, outcome });
  }
  snapshot(): SubAgentRunSnapshot { return Object.freeze({ ...this.initial, records: Object.freeze([...this.records]) }); }
  private validateCandidate(input: SubAgentClaim): void {
    const child = input.candidate;
    if (!this.id(input.commandId) ||
        !this.ids(child).every(value => this.id(value)) ||
        new Set(this.ids(child)).size !== 4 ||
        this.ids(child).some(value => [this.initial.runId,this.initial.rootSessionId,this.initial.rootBudgetScopeId,input.commandId].includes(value)) ||
        !this.id(child.parentSessionId) ||
        !this.id(child.parentBudgetScopeId) ||
        input.requestKey !== createSubAgentCommandKey(child) ||
        child.runId !== this.initial.runId ||
        child.scope.scopeId !== this.initial.scope.scopeId ||
        child.scope.projectId !== this.initial.scope.projectId ||
        child.scope.workspaceId !== this.initial.scope.workspaceId ||
        child.depth < 1 ||
        child.depth > this.initial.maxDepth) this.invalid();
    if (child.parentChildId === null) { if (child.parentSessionId !== this.initial.rootSessionId ||
        child.parentBudgetScopeId !== this.initial.rootBudgetScopeId ||
        child.depth !== 1) this.invalid(); return; }
    const parent = this.records.find(record => record.claim.candidate.childId === child.parentChildId)?.claim.candidate;
    if (parent === undefined ||
        child.parentSessionId !== parent.sessionId ||
        child.parentBudgetScopeId !== parent.budgetScopeId ||
        child.depth !== parent.depth + 1 ||
        (child.request.access === "edit" && parent.request.access !== "edit") ||
        child.request.toolIds.some(id => !parent.request.toolIds.includes(id)) ||
        child.request.filePaths.some(path => !parent.request.filePaths.includes(path)) ||
        usageDimensions.some(key => child.request.limits[key] > parent.request.limits[key]) ||
        (parent.request.deadlineEpochMs !== null && (child.request.deadlineEpochMs === null ||
        child.request.deadlineEpochMs > parent.request.deadlineEpochMs))) this.invalid();
  }
  private id(value: string): boolean { return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,128}$/.test(value); }
  private ids(child: AdmittedSubAgent): readonly string[] { return [child.childId,child.sessionId,child.operationId,child.budgetScopeId]; }
  private ancestors(parentId: string | null): readonly SubAgentRecord[] {
    const result: SubAgentRecord[] = []; let current = parentId;
    while (current !== null) { const record = this.records.find(item => item.claim.candidate.childId === current); if (record === undefined ||
        result.includes(record)) this.invalid(); result.push(record); current = record.claim.candidate.parentChildId; }
    return result;
  }
  private open(record: SubAgentRecord): boolean { return record.outcome === null || (record.outcome.status !== "completed" && record.outcome.pendingOperationRefs.length > 0); }
  private canonical(value: unknown): string { return JSON.stringify(value, (_key, item: unknown) => item !== null && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([left],[right]) => left < right ? -1 : left > right ? 1 : 0)) : item); }
  private invalid(): never { throw new SubAgentCoordinationError(); }
}
