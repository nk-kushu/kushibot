import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import { InvalidPersistenceRecordError } from "../errors/InvalidPersistenceRecordError.js";

export class JsonValueContract implements IResultContract<JsonValue> {
  readonly id = "finite-json";
  readonly version = "1";

  async validate(value: unknown): Promise<ValidationResult<JsonValue>> {
    try {
      return { valid: true, value: this.copy(value, new Set<object>(), { remaining: 10000 }, 0) };
    } catch (error: unknown) {
      if (!(error instanceof InvalidPersistenceRecordError)) throw error;
      return { valid: false, issues: [{ path: [], code: error.code, message: error.message }] };
    }
  }

  private copy(value: unknown, ancestors: Set<object>, budget: { remaining: number }, depth: number): JsonValue {
    budget.remaining -= 1;
    if (budget.remaining < 0 || depth > 64) throw new InvalidPersistenceRecordError("JSON structure limit reached.");
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "object" || value === null || ancestors.has(value)) {
      throw new InvalidPersistenceRecordError("Unsupported or cyclic JSON value.");
    }
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null) {
      throw new InvalidPersistenceRecordError("Only plain JSON objects are supported.");
    }
    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        if (value.length > budget.remaining || Reflect.ownKeys(value).length !== value.length + 1) {
          throw new InvalidPersistenceRecordError("Array structure is oversized or has unsupported fields.");
        }
        const descriptors = Object.getOwnPropertyDescriptors(value);
        const items: JsonValue[] = [];
        for (let index = 0; index < value.length; index += 1) {
          const descriptor = descriptors[String(index)];
          if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
            throw new InvalidPersistenceRecordError("Sparse arrays and array getters are unsupported.");
          }
          items.push(this.copy(descriptor.value, ancestors, budget, depth + 1));
        }
        return Object.freeze(items);
      }
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const output: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
      if (Reflect.ownKeys(value).some(key => typeof key !== "string")) {
        throw new InvalidPersistenceRecordError("Symbol JSON keys are unsupported.");
      }
      for (const key of Object.keys(descriptors).sort()) {
        const descriptor = descriptors[key];
        if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
          throw new InvalidPersistenceRecordError("JSON getters and hidden fields are unsupported.");
        }
        output[key] = this.copy(descriptor.value, ancestors, budget, depth + 1);
      }
      return Object.freeze(output);
    } finally {
      ancestors.delete(value);
    }
  }
}
