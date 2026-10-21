import type { IResultContract } from "../../src/contracts/validation/IResultContract.js";
import type { ValidationResult } from "../../src/contracts/validation/ValidationResult.js";

export class StringResultContract implements IResultContract<string> {
  readonly id = "test-string";
  readonly version = "1";

  async validate(value: unknown): Promise<ValidationResult<string>> {
    if (typeof value !== "string") {
      return {
        valid: false,
        issues: [{ path: [], code: "expected-string", message: "Expected a string." }],
      };
    }
    return { valid: true, value };
  }
}
