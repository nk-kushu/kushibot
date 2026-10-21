import { createSubAgentCommandKey } from "./createSubAgentCommandKey.js";
import type { SubAgentAuthority } from "./SubAgentAuthority.js";
import type { SubAgentRequest } from "./SubAgentRequest.js";
import type { SubAgentOutcome } from "./SubAgentOutcome.js";
import type { AdmittedSubAgent } from "./AdmittedSubAgent.js";
import type { ISubAgentJournal } from "./ISubAgentJournal.js";
import type { IAgenticUnitFactory } from "./IAgenticUnitFactory.js";
import type { IPolicy } from "../../contracts/IPolicy.js";
import type { SubAgentPolicyInput } from "./SubAgentPolicyInput.js";
import type { SubAgentPolicyDecision } from "./SubAgentPolicyDecision.js";
import type { IUsageLedgerStore } from "../../usage/IUsageLedgerStore.js";
import type { IClock } from "../../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import { usageDimensions } from "../../usage/usageDimensions.js";
import { ExecutionBoundaryGuard } from "../../execution-control/ExecutionBoundaryGuard.js";
import { SubAgentRequestContract } from "./SubAgentRequestContract.js";
import { ChildOutcomeContract } from "./ChildOutcomeContract.js";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError.js";
export class SubAgentCoordinator {
  private readonly authority: SubAgentAuthority;
  constructor(authority: SubAgentAuthority,
    private readonly requests: SubAgentRequestContract,
    private readonly outcomes: ChildOutcomeContract,
    private readonly policy: IPolicy<SubAgentPolicyInput,SubAgentPolicyDecision>,
    private readonly journal: ISubAgentJournal,
    private readonly factory: IAgenticUnitFactory,
    private readonly ledger: IUsageLedgerStore,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock) {
    if (![authority.runId,authority.parentSessionId,authority.parentBudgetScopeId].every(id => /^[A-Za-z0-9_.:-]{1,128}$/.test(id)) ||
        (authority.parentChildId !== null && !/^[A-Za-z0-9_.:-]{1,128}$/.test(authority.parentChildId)) ||
        !Number.isSafeInteger(authority.parentDepth) ||
        authority.parentDepth < 0 ||
        authority.parentDepth > 8 ||
        (authority.parentChildId === null) !== (authority.parentDepth === 0) ||
        !usageDimensions.every(key => Number.isSafeInteger(authority.limits[key]) && authority.limits[key] >= 0)) throw new SubAgentCoordinationError();
    this.authority = Object.freeze({ ...authority, allowedToolIds: Object.freeze([...authority.allowedToolIds]), allowedModelRoles: Object.freeze([...authority.allowedModelRoles]), allowedResultContractIds: Object.freeze([...authority.allowedResultContractIds]), allowedFilePaths: Object.freeze([...authority.allowedFilePaths]), limits: Object.freeze({...authority.limits}) });
  }
  async spawn(raw: unknown, context: IExecutionContext): Promise<SubAgentOutcome> {
    const auth = this.authority;
    if (context.identity.runId !== auth.runId || context.identity.sessionId !== auth.parentSessionId) throw new SubAgentCoordinationError();
    if (!auth.canSpawn) return { status: "rejected", code: "SPAWN_NOT_PERMITTED" };
    const checked = await this.requests.validate(raw); if (!checked.valid) return { status: "rejected", code: "INVALID_SUB_AGENT_REQUEST" };
    const proposed = checked.value;
    if (!auth.allowedModelRoles.includes(proposed.modelRole) ||
        !auth.allowedResultContractIds.includes(proposed.resultContractId) ||
        proposed.toolIds.some(id => !auth.allowedToolIds.includes(id)) ||
        proposed.filePaths.some(path => !auth.allowedFilePaths.includes(path)) ||
        (proposed.access === "edit" && !auth.canEdit) ||
        usageDimensions.some(key => proposed.limits[key] > auth.limits[key])) return { status: "rejected", code: "CHILD_CAPABILITY_ESCALATION" };
    const deadlines = [context.deadlineEpochMs,proposed.deadlineEpochMs].filter((value): value is number => value !== null);
    const request: SubAgentRequest = Object.freeze({ ...proposed, deadlineEpochMs: deadlines.length === 0 ? null : Math.min(...deadlines) });
    const guard = new ExecutionBoundaryGuard(this.clock,context.signal,request.deadlineEpochMs);
    if (guard.check() !== null) return { status: "rejected", code: "CHILD_CONTROL_STOP" };
    const decision = await this.policy.apply({ request, depth: auth.parentDepth + 1 });
    if (!decision.allowed) return { status: "rejected", code: /^[A-Z0-9_]{1,64}$/.test(decision.code) ? decision.code : "CHILD_POLICY_REJECTED" };
    if (guard.check() !== null) return { status: "rejected", code: "CHILD_CONTROL_STOP" };
    const candidate: AdmittedSubAgent = Object.freeze({ childId: this.ids.nextId(), sessionId: this.ids.nextId(), operationId: this.ids.nextId(), budgetScopeId: this.ids.nextId(), parentSessionId: auth.parentSessionId, parentChildId: auth.parentChildId, parentBudgetScopeId: auth.parentBudgetScopeId, depth: auth.parentDepth + 1, runId: auth.runId, scope: Object.freeze({...context.scope}), request });
    const key = createSubAgentCommandKey(candidate);
    const claim = await this.journal.claim({ commandId: context.identity.operationId, requestKey: key, candidate });
    if (claim.status === "existing") return claim.response;
    if (claim.status === "rejected") return claim;
    const child = claim.child;
    await this.ledger.mutate(ledger => ledger.addScope({ id: child.budgetScopeId, parentId: child.parentBudgetScopeId, limits: child.request.limits }));
    const childContext: IExecutionContext = Object.freeze({ ...context, deadlineEpochMs: child.request.deadlineEpochMs, identity: Object.freeze({ ...context.identity, operationId: child.operationId, parentOperationId: context.identity.operationId, sessionId: child.sessionId }) });
    const stopped = guard.check();
    if (stopped !== null) return this.deliver(child, { status: "stopped", reason: stopped, partial: { summary: "Child admitted; execution did not start.", evidenceRefs: [], artifactRefs: [], unresolved: ["Child assignment is incomplete."] }, pendingOperationRefs: [] });
    const binding = await this.factory.create(child,childContext);
    if (binding.resultContract.id !== request.resultContractId) throw new SubAgentCoordinationError();
    const beforeExecute = guard.check();
    if (beforeExecute !== null) return this.deliver(child, { status: "stopped", reason: beforeExecute, partial: { summary: "Child constructed; execution did not start.", evidenceRefs: [], artifactRefs: [], unresolved: ["Child assignment is incomplete."] }, pendingOperationRefs: [] });
    let rawOutcome: unknown;
    try { rawOutcome = await binding.unit.execute(undefined,childContext); }
    catch { return { status: "pending", childId: child.childId, pendingOperationRefs: [child.operationId] }; }
    const outcome = await this.outcomes.validate(rawOutcome);
    if (!outcome.valid) return { status: "pending", childId: child.childId, pendingOperationRefs: [child.operationId] };
    if (outcome.value.status === "completed") {
      const validResult = await binding.resultContract.validate(outcome.value.result);
      if (!validResult.valid) return { status: "pending", childId: child.childId, pendingOperationRefs: [child.operationId] };
      return this.deliver(child,{ status: "completed", result: validResult.value });
    }
    return this.deliver(child,outcome.value);
  }
  private async deliver(child: AdmittedSubAgent, raw: unknown): Promise<SubAgentOutcome> {
    const checked = await this.outcomes.validate(raw); if (!checked.valid) throw new SubAgentCoordinationError();
    await this.journal.complete(child.childId,checked.value);
    return { status: "returned", childId: child.childId, sessionId: child.sessionId, outcome: checked.value };
  }
}
