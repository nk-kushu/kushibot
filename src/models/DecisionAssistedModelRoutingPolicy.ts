import type { IPolicy } from "../contracts/IPolicy.js";
import type { IDecisionUnit } from "../decisions/IDecisionUnit.js";
import type { ModelSelectionInput } from "./ModelSelectionInput.js";
import type { ModelSelectionOutcome } from "./ModelSelectionOutcome.js";
export class DecisionAssistedModelRoutingPolicy implements IPolicy<ModelSelectionInput, ModelSelectionOutcome> {
  constructor(private readonly decisions: IDecisionUnit, private readonly fallback: IPolicy<ModelSelectionInput, ModelSelectionOutcome>) {}
  async apply(input: ModelSelectionInput): Promise<ModelSelectionOutcome> {
    if (input.context.explicitProfileId !== null || input.candidates.length <= 1) return this.fallback.apply(input);
    const outcome = await this.decisions.evaluate({ purpose: "select-model-profile", question: "Select a configured eligible profile for this task role, or abstain.",
      options: input.candidates.map(item => item.profile.id), evidence: [{ ref: "routing:role", text: `Task role: ${input.context.role}. Options have already passed deterministic eligibility; aliases do not imply measured model quality.` }, ...(input.context.taskSummary.length === 0 ? [] : [{ ref: "routing:task", text: input.context.taskSummary }])] }, input.control);
    if (outcome.status === "uncertain") return { kind: "uncertain", operationId: outcome.operationId };
    if (outcome.status === "stopped") return { kind: "stopped", reason: outcome.reason };
    if (outcome.status === "answered") return { kind: "selected", profileId: outcome.answer.choice, policyId: "decision-assisted-routing", policyVersion: "1", reasonCode: "ELIGIBLE_CANDIDATE_RECOMMENDATION" };
    if (!input.context.allowFallback) return { kind: "unavailable", reasons: ["RECOMMENDATION_NOT_ACCEPTED"] };
    const fallback = await this.fallback.apply(input);
    return fallback.kind === "selected" ? { ...fallback, reasonCode: "RECOMMENDATION_FALLBACK" } : fallback;
  }
}
