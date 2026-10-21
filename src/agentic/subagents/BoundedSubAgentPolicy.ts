import type { IPolicy } from "../../contracts/IPolicy.js";
import type { SubAgentPolicyInput } from "./SubAgentPolicyInput.js";
import type { SubAgentPolicyDecision } from "./SubAgentPolicyDecision.js";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError.js";
export class BoundedSubAgentPolicy implements IPolicy<SubAgentPolicyInput, SubAgentPolicyDecision> {
  constructor(private readonly maxTurns: number) { if (!Number.isSafeInteger(maxTurns) || maxTurns < 1 || maxTurns > 128) throw new SubAgentCoordinationError(); }
  async apply(input: SubAgentPolicyInput): Promise<SubAgentPolicyDecision> { return input.request.maxTurns <= this.maxTurns ? { allowed: true } : { allowed: false, code: "CHILD_TURN_CAP" }; }
}
