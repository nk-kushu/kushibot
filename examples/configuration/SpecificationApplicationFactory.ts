import type { IPolicy } from "../../src/index.js";
import type { IConfigurationResolver } from "../../src/configuration/IConfigurationResolver.js";
import type { ICapabilityRegistry } from "../../src/composition/ICapabilityRegistry.js";
import type { RuntimeDependencies } from "../../src/composition/RuntimeDependencies.js";
import type { ValidationResult } from "../../src/contracts/validation/ValidationResult.js";
import type { SpecificationPolicyInput } from "../shared-policy/SpecificationPolicyInput.js";
import type { SpecificationAssignment } from "../shared-policy/SpecificationAssignment.js";
import type { ConfiguredApplication } from "./ConfiguredApplication.js";
import { SpecificationApplication } from "./SpecificationApplication.js";

export class SpecificationApplicationFactory {
  constructor(
    private readonly configuration: IConfigurationResolver,
    private readonly policies: ICapabilityRegistry<IPolicy<SpecificationPolicyInput, SpecificationAssignment>>,
    private readonly runtime: RuntimeDependencies,
  ) {}

  async create(overrides: unknown, policyId: string): Promise<ValidationResult<ConfiguredApplication>> {
    const resolved = await this.configuration.resolve(overrides);
    if (!resolved.valid) return resolved;
    const policy = this.policies.get(policyId);
    return {
      valid: true,
      value: {
        application: new SpecificationApplication(policy, this.runtime),
        configuration: resolved.value,
        policyMetadata: this.policies.describe(policyId),
      },
    };
  }
}
