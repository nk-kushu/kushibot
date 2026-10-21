import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { FrameworkConfiguration } from "./FrameworkConfiguration.js";

export class FrameworkConfigurationContract implements IResultContract<FrameworkConfiguration> {
  readonly id = "framework-configuration";
  readonly version = "1";

  async validate(value: unknown): Promise<ValidationResult<FrameworkConfiguration>> {
    if (!this.isPlainRecord(value)) return this.invalid([], "Expected a configuration object.");
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(value).some(key => typeof key !== "string")) {
      return this.invalid([], "Symbol configuration fields are unsupported.");
    }
    const allowed = ["logEnabled", "logLevel", "maxIterations", "maxSubAgents", "maxSubAgentDepth"] as const;
    const unexpected = Object.keys(descriptors).find(key => !allowed.includes(key as typeof allowed[number]));
    if (unexpected !== undefined) return this.invalid([unexpected], "Unknown configuration field.");
    for (const key of Object.keys(descriptors)) {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
        return this.invalid([key], "Configuration fields must be enumerable data values.");
      }
    }
    const data = Object.fromEntries(
      Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]),
    ) as Record<string, unknown>;
    if (typeof data.logEnabled !== "boolean") return this.invalid(["logEnabled"], "Expected a boolean.");
    const level = data.logLevel;
    if (level !== "debug" && level !== "info" && level !== "warn" && level !== "error") {
      return this.invalid(["logLevel"], "Expected debug, info, warn, or error.");
    }
    if (!this.isIntegerAtLeast(data.maxIterations, 1)) {
      return this.invalid(["maxIterations"], "Expected a positive safe integer.");
    }
    if (!this.isIntegerAtLeast(data.maxSubAgents, 0)) {
      return this.invalid(["maxSubAgents"], "Expected a nonnegative safe integer.");
    }
    if (!this.isIntegerAtLeast(data.maxSubAgentDepth, 0)) {
      return this.invalid(["maxSubAgentDepth"], "Expected a nonnegative safe integer.");
    }
    return {
      valid: true,
      value: Object.freeze({
        logEnabled: data.logEnabled,
        logLevel: level,
        maxIterations: data.maxIterations,
        maxSubAgents: data.maxSubAgents,
        maxSubAgentDepth: data.maxSubAgentDepth,
      }),
    };
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  private isIntegerAtLeast(value: unknown, minimum: number): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
  }

  private invalid(path: readonly (string | number)[], message: string): ValidationResult<FrameworkConfiguration> {
    return { valid: false, issues: [{ path, code: "invalid-configuration", message }] };
  }
}
