import type Joi from "joi";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";

/** Adapts a Joi object schema to tool argument validation and JSON Schema. */
export class JoiArgumentsContract implements IResultContract<JsonValue> {
  readonly version = "1";
  private readonly json = new JsonValueContract();
  private readonly definition: Joi.ObjectSchema;

  constructor(readonly id: string, definition: Joi.ObjectSchema) {
    this.definition = definition.required().unknown(false).prefs({ convert: false, abortEarly: false });
  }

  get schema(): JsonValue {
    return this.definition["~standard"].jsonSchema.input({ target: "draft-2020-12" }) as JsonValue;
  }

  async validate(value: unknown): Promise<ValidationResult<JsonValue>> {
    const checked = await this.json.validate(value);
    if (!checked.valid) return checked;
    const result = this.definition.validate(checked.value, { convert: false, abortEarly: false });
    if (result.error) {
      return {
        valid: false,
        issues: result.error.details.map(issue => ({
          path: issue.path, code: issue.type, message: issue.message,
        })),
      };
    }
    return this.json.validate(result.value);
  }
}
