import type { IPolicy } from "../contracts/IPolicy.js";
import type { EscalationInput } from "./EscalationInput.js";
import type { EscalationDecision } from "./EscalationDecision.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";
export class VerificationEscalationPolicy implements IPolicy<EscalationInput, EscalationDecision> {
  constructor(private readonly failureThreshold: number, private readonly maxEscalations: number) {
    if (!Number.isSafeInteger(failureThreshold) || failureThreshold < 1 || !Number.isSafeInteger(maxEscalations) || maxEscalations < 0) throw new ConfigurationError("Invalid escalation limits.");
  }
  async apply(input: EscalationInput): Promise<EscalationDecision> {
    if (![input.consecutiveFailures, input.escalationsUsed].every(value => Number.isSafeInteger(value) && value >= 0) ||
        !this.references(input.failedCheckRefs) || !this.references(input.pendingOperationRefs)) throw new ConfigurationError("Invalid escalation evidence.");
    if (input.pendingOperationRefs.length > 0) return { action: "stop", reasonCode: "UNRESOLVED_OPERATIONS" };
    if (input.consecutiveFailures < this.failureThreshold) return { action: "stay", reasonCode: "BELOW_FAILURE_THRESHOLD" };
    if (input.escalationsUsed >= this.maxEscalations) return { action: "stop", reasonCode: "ESCALATION_LIMIT_REACHED" };
    if (input.failedCheckRefs.length === 0) return { action: "stop", reasonCode: "VERIFICATION_EVIDENCE_MISSING" };
    return { action: "request-handoff", reasonCode: "REPEATED_VERIFIED_FAILURE" };
  }
  private references(value: readonly string[]): boolean { return Array.isArray(value) && value.length <= 128 && value.every(ref => typeof ref === "string" && /^[a-zA-Z0-9_.:/-]{1,128}$/.test(ref)); }
}
