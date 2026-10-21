import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import type { IResultContract } from "../../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../../contracts/validation/ValidationResult.js";
export class ReadSourceArgumentsContract implements IResultContract<JsonValue> {
  readonly id = "read-source-arguments"; readonly version = "1";
  async validate(value: unknown): Promise<ValidationResult<JsonValue>> {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const data = value as Record<string, unknown>;
      if (Object.keys(data).sort().join(",") === "maxBytes,sourceRef" && typeof data.sourceRef === "string" && /^source:[a-zA-Z0-9_.:/-]{1,128}$/.test(data.sourceRef) &&
          typeof data.maxBytes === "number" && Number.isSafeInteger(data.maxBytes) && data.maxBytes >= 1 && data.maxBytes <= 8192) {
        return { valid: true, value: Object.freeze({ sourceRef: data.sourceRef, maxBytes: data.maxBytes }) };
      }
    }
    return { valid: false, issues: [{ path: [], code: "invalid-source-read", message: "Source reference or read bound is invalid." }] };
  }
}
