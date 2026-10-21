import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { FrameworkConfiguration } from "./FrameworkConfiguration.js";

export interface IConfigurationResolver {
  resolve(overrides: unknown): Promise<ValidationResult<FrameworkConfiguration>>;
}
