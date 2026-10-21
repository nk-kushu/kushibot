import type { IPolicy } from "../../src/index.js";
import type { RuntimeDependencies } from "../../src/composition/RuntimeDependencies.js";
import type { SpecificationPolicyInput } from "../shared-policy/SpecificationPolicyInput.js";
import type { SpecificationAssignment } from "../shared-policy/SpecificationAssignment.js";
import type { SpecificationPreparation } from "./SpecificationPreparation.js";

export class SpecificationApplication {
  constructor(
    private readonly policy: IPolicy<SpecificationPolicyInput, SpecificationAssignment>,
    private readonly runtime: RuntimeDependencies,
  ) {}

  async prepare(input: SpecificationPolicyInput): Promise<SpecificationPreparation> {
    const operationId = this.runtime.ids.nextId();
    const startedAtEpochMs = this.runtime.clock.nowEpochMs();
    const assignment = await this.policy.apply(input);
    return { operationId, startedAtEpochMs, assignment };
  }
}
