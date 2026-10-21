import type { IPolicy } from "../../src/contracts/IPolicy.js";
import type { SpecificationPolicyInput } from "../../examples/shared-policy/SpecificationPolicyInput.js";
import type { SpecificationAssignment } from "../../examples/shared-policy/SpecificationAssignment.js";

export class EmptyFindingsPolicy
  implements IPolicy<SpecificationPolicyInput, SpecificationAssignment> {
  async apply(input: SpecificationPolicyInput): Promise<SpecificationAssignment> {
    return {
      goal: input.goal,
      findings: [],
      sourceVersion: input.sourceVersion,
    };
  }
}
