import type { IPolicy } from "../../src/index.js";
import type { SpecificationPolicyInput } from "./SpecificationPolicyInput.js";
import type { SpecificationAssignment } from "./SpecificationAssignment.js";

export class SpecificationInputPolicy
  implements IPolicy<SpecificationPolicyInput, SpecificationAssignment> {
  async apply(input: SpecificationPolicyInput): Promise<SpecificationAssignment> {
    return {
      goal: input.goal,
      findings: [...input.acceptedFindings],
      sourceVersion: input.sourceVersion,
    };
  }
}
