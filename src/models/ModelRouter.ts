import type { IPolicy } from "../contracts/IPolicy.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { ModelCallControl } from "../agentic/model/ModelCallControl.js";
import type { RoutingLayer } from "./RoutingLayer.js";
import type { ModelSelectionInput } from "./ModelSelectionInput.js";
import type { ModelSelectionOutcome } from "./ModelSelectionOutcome.js";
import type { ModelRoutingOutcome } from "./ModelRoutingOutcome.js";
import type { ModelEligibilityInput } from "./ModelEligibilityInput.js";
import type { ModelEligibilityDecision } from "./ModelEligibilityDecision.js";
import { ModelEligibilityPolicy } from "./ModelEligibilityPolicy.js";
import { ModelProfileRegistry } from "./ModelProfileRegistry.js";
import { RoutingContextResolver } from "./RoutingContextResolver.js";
import { RoutingBudgetReader } from "./RoutingBudgetReader.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
export class ModelRouter {
  private readonly mandatoryEligibility = new ModelEligibilityPolicy();
  constructor(private readonly profiles: ModelProfileRegistry, private readonly contexts: RoutingContextResolver,
    private readonly budgets: RoutingBudgetReader, private readonly eligibility: IPolicy<ModelEligibilityInput, ModelEligibilityDecision>,
    private readonly selection: IPolicy<ModelSelectionInput, ModelSelectionOutcome>, private readonly clock: IClock) {}
  async route(role: string, layers: readonly RoutingLayer[], control: ModelCallControl): Promise<ModelRoutingOutcome> {
    const context = this.contexts.resolve(role, layers);
    if (!/^[a-zA-Z0-9_.:-]{1,128}$/.test(control.operationId)) return { kind: "unavailable", reasons: ["ROUTING_ID_INVALID"] };
    const guard = new ExecutionBoundaryGuard(this.clock, control.signal, control.deadlineEpochMs);
    const before = guard.check(); if (before !== null) return { kind: "stopped", reason: before };
    const budget = await this.budgets.read(); const candidates = [];
    for (const id of context.preferredProfileIds) {
      const candidate = this.profiles.resolve(id);
      if ((await this.checkEligibility({ candidate, context, budget })).eligible) candidates.push(candidate);
    }
    const filteredStop = guard.check(); if (filteredStop !== null) return { kind: "stopped", reason: filteredStop };
    if (candidates.length === 0) return { kind: "unavailable", reasons: ["NO_ELIGIBLE_PROFILE"] };
    const choice = await this.selection.apply(Object.freeze({ context, candidates: Object.freeze(candidates), control }));
    if (choice.kind === "uncertain") return choice;
    const selectionStop = guard.check(); if (selectionStop !== null) return { kind: "stopped", reason: selectionStop };
    if (choice.kind !== "selected") return choice;
    if (!/^[a-zA-Z0-9_.:-]{1,128}$/.test(choice.policyId) || !/^[a-zA-Z0-9_.-]{1,32}$/.test(choice.policyVersion) || !/^[A-Z][A-Z0-9_]{0,127}$/.test(choice.reasonCode)) return { kind: "unavailable", reasons: ["SELECTION_METADATA_INVALID"] };
    const after = guard.check(); if (after !== null) return { kind: "stopped", reason: after };
    const candidate = candidates.find(item => item.profile.id === choice.profileId);
    if (candidate === undefined) return { kind: "unavailable", reasons: ["SELECTION_OUTSIDE_ELIGIBLE_SET"] };
    if (context.explicitProfileId !== null && choice.profileId !== context.explicitProfileId && !context.allowFallback) return { kind: "unavailable", reasons: ["EXPLICIT_BINDING_CANNOT_FALL_BACK"] };
    const checked = await this.checkEligibility({ candidate, context, budget: await this.budgets.read() });
    if (!checked.eligible) return { kind: "unavailable", reasons: checked.reasons };
    const finalStop = guard.check(); if (finalStop !== null) return { kind: "stopped", reason: finalStop };
    return Object.freeze({ kind: "selected", decision: Object.freeze({ operationId: control.operationId, registration: candidate, context,
      policyId: choice.policyId, policyVersion: choice.policyVersion, reasonCode: choice.reasonCode }) });
  }
  private async checkEligibility(input: ModelEligibilityInput): Promise<ModelEligibilityDecision> {
    const required = await this.mandatoryEligibility.apply(input);
    return required.eligible ? this.eligibility.apply(input) : required;
  }
}
