import type { IDecisionUnit } from "../decisions/IDecisionUnit.js";
import type { IPolicy } from "../contracts/IPolicy.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { ModelCallControl } from "../agentic/model/ModelCallControl.js";
import type { GuardSelectionInput } from "./GuardSelectionInput.js";
import type { GuardSelection } from "./GuardSelection.js";
import type { GuardSelectionOutcome } from "./GuardSelectionOutcome.js";
import { GuardRegistry } from "./GuardRegistry.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { GuardConfigurationError } from "../errors/GuardConfigurationError.js";
export class GuardSelectionService {
  constructor(private readonly registry: GuardRegistry, private readonly decisions: IDecisionUnit,
    private readonly policy: IPolicy<GuardSelectionInput, GuardSelection>, private readonly ids: IIdGenerator, private readonly clock: IClock) {}
  async select(requiredIds: readonly string[], optionalIds: readonly string[], taskSummary: string, control: ModelCallControl): Promise<GuardSelectionOutcome> {
    if (requiredIds.length > 8 || optionalIds.length > 8 || new Set([...requiredIds, ...optionalIds]).size !== requiredIds.length + optionalIds.length ||
        typeof taskSummary !== "string" || taskSummary.trim().length === 0 || new TextEncoder().encode(taskSummary).byteLength > 1024 || /[\u0000-\u001f]/.test(taskSummary)) throw new GuardConfigurationError();
    const required = Object.freeze(requiredIds.map(id => this.registry.guard(id)));
    const candidates = optionalIds.map(id => this.registry.guard(id));
    const evaluated: GuardSelectionInput["optional"][number][] = [];
    const controls = new ExecutionBoundaryGuard(this.clock, control.signal, control.deadlineEpochMs);
    let stopReason = controls.check(); let index = 0;
    for (; index < candidates.length && stopReason === null; index++) {
      const guard = candidates[index];
      const outcome = await this.decisions.evaluate({ purpose: "select-guard", question: "Should this optional guard apply to the task?", options: ["include", "exclude"],
        evidence: [{ ref: "task:summary", text: taskSummary }, { ref: `guard:${guard.id}`, text: guard.description }] }, { ...control, operationId: this.ids.nextId() });
      evaluated.push(Object.freeze({ guard, outcome }));
      stopReason = controls.check();
      if (outcome.status === "stopped") stopReason = outcome.reason;
      if (outcome.status === "uncertain" || stopReason !== null) { index++; break; }
    }
    const proposal = await this.policy.apply(Object.freeze({ required, optional: Object.freeze(evaluated), unevaluated: Object.freeze(candidates.slice(index).map(guard => guard.id)) }));
    const known = new Map([...required, ...candidates].map(guard => [guard.id, guard]));
    if (proposal.schemaVersion !== 1 || proposal.guards.length > 16 || proposal.guards.some(guard => known.get(guard.id)?.version !== guard.version) ||
        proposal.unresolvedGuardIds.some(id => !known.has(id))) throw new GuardConfigurationError();
    // Canonicalize definitions and preserve mandatory guards/uncertainty independently of the configurable policy.
    const selected = new Map(required.map(guard => [guard.id, guard]));
    for (const guard of proposal.guards) selected.set(guard.id, known.get(guard.id)!);
    const unresolved = new Set([...proposal.unresolvedGuardIds, ...candidates.slice(index).map(guard => guard.id)]);
    const pending = new Set(evaluated.flatMap(item => item.outcome.status === "uncertain" ? [item.outcome.operationId] : []));
    for (const reference of proposal.pendingOperationRefs) pending.add(reference);
    return Object.freeze({ selection: Object.freeze({ schemaVersion: 1 as const, guards: Object.freeze([...selected.values()]), unresolvedGuardIds: Object.freeze([...unresolved]), pendingOperationRefs: Object.freeze([...pending]) }), stopReason: stopReason ?? controls.check() });
  }
}
