import type { IResultContract } from "../../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../../contracts/validation/ValidationResult.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import { JsonValueContract } from "../../persistence/JsonValueContract.js";
import { SubAgentRequestContract } from "./SubAgentRequestContract.js";
export class SubAgentArgumentsContract implements IResultContract<JsonValue> {
  readonly id = "spawn-sub-agent-arguments"; readonly version = "1";
  constructor(private readonly requests: SubAgentRequestContract, private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<JsonValue>> { const checked = await this.requests.validate(raw); return checked.valid ? this.json.validate(checked.value) : checked; }
}
