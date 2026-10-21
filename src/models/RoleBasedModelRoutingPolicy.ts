import type { IPolicy } from "../contracts/IPolicy.js";
import type { ModelSelectionInput } from "./ModelSelectionInput.js";
import type { ModelSelectionOutcome } from "./ModelSelectionOutcome.js";
export class RoleBasedModelRoutingPolicy implements IPolicy<ModelSelectionInput, ModelSelectionOutcome> {
  async apply(input: ModelSelectionInput): Promise<ModelSelectionOutcome> {
    const allowed = new Set(input.candidates.map(item => item.profile.id));
    const bound = input.context.explicitProfileId;
    if (bound !== null && allowed.has(bound)) return this.selected(bound, "EXPLICIT_BINDING");
    if (bound !== null && !input.context.allowFallback) return { kind: "unavailable", reasons: ["EXPLICIT_BINDING_INELIGIBLE"] };
    const selected = input.context.preferredProfileIds.find(id => allowed.has(id));
    return selected === undefined ? { kind: "unavailable", reasons: ["NO_ELIGIBLE_PROFILE"] } : this.selected(selected, bound === null ? "CONFIGURED_PREFERENCE" : "EXPLICIT_BINDING_FALLBACK");
  }
  private selected(profileId: string, reasonCode: string): ModelSelectionOutcome { return Object.freeze({ kind: "selected", profileId, policyId: "configured-role-routing", policyVersion: "1", reasonCode }); }
}
