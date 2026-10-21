import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { FrameworkConfiguration } from "./FrameworkConfiguration.js";
import type { IConfigurationResolver } from "./IConfigurationResolver.js";

export class FrameworkConfigurationResolver implements IConfigurationResolver {
  private readonly defaults: FrameworkConfiguration;

  constructor(
    defaults: FrameworkConfiguration,
    private readonly contract: IResultContract<FrameworkConfiguration>,
  ) {
    this.defaults = Object.freeze({ ...defaults });
  }

  async resolve(overrides: unknown): Promise<ValidationResult<FrameworkConfiguration>> {
    const checkedDefaults = await this.contract.validate(this.defaults);
    if (!checkedDefaults.valid) return checkedDefaults;
    const checkedOverrides = this.copyOverrides(overrides);
    if (!checkedOverrides.valid) return checkedOverrides;
    return this.contract.validate({ ...checkedDefaults.value, ...checkedOverrides.value });
  }

  private copyOverrides(overrides: unknown): ValidationResult<Record<string, unknown>> {
    if (typeof overrides !== "object" || overrides === null || Array.isArray(overrides)) {
      return { valid: false, issues: [{ path: [], code: "invalid-overrides", message: "Expected an overrides object." }] };
    }
    const prototype = Object.getPrototypeOf(overrides);
    if (prototype !== Object.prototype && prototype !== null) {
      return { valid: false, issues: [{ path: [], code: "invalid-overrides", message: "Expected plain configuration data." }] };
    }
    if (Reflect.ownKeys(overrides).some(key => typeof key !== "string")) {
      return { valid: false, issues: [{ path: [], code: "invalid-overrides", message: "Symbol override fields are unsupported." }] };
    }
    const descriptors = Object.getOwnPropertyDescriptors(overrides);
    const result: Record<string, unknown> = Object.create(null);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!descriptor.enumerable || !("value" in descriptor)) {
        return { valid: false, issues: [{ path: [key], code: "invalid-overrides", message: "Overrides must be enumerable data values." }] };
      }
      result[key] = descriptor.value;
    }
    return { valid: true, value: result };
  }
}
