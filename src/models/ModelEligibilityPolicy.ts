import type { IPolicy } from "../contracts/IPolicy.js";
import type { ModelEligibilityInput } from "./ModelEligibilityInput.js";
import type { ModelEligibilityDecision } from "./ModelEligibilityDecision.js";
export class ModelEligibilityPolicy implements IPolicy<ModelEligibilityInput, ModelEligibilityDecision> {
  async apply(input: ModelEligibilityInput): Promise<ModelEligibilityDecision> {
    const { candidate, context, budget } = input; const required = context.requirements; const reasons: string[] = [];
    if (!context.allowedProfileIds.includes(candidate.profile.id)) reasons.push("PROFILE_NOT_PERMITTED");
    if (required.capabilities.some(value => !candidate.capabilities.includes(value))) reasons.push("CAPABILITY_UNSUPPORTED");
    if (required.outputTokens > candidate.profile.maxOutputTokens || required.inputTokens > candidate.profile.contextTokens - required.outputTokens) reasons.push("CONTEXT_OR_OUTPUT_TOO_SMALL");
    if (budget.available.modelCalls < 1 || budget.available.inputTokens < required.inputTokens || budget.available.outputTokens < required.outputTokens) reasons.push("ALLOWANCE_UNAVAILABLE");
    return Object.freeze({ eligible: reasons.length === 0, reasons: Object.freeze(reasons) });
  }
}
