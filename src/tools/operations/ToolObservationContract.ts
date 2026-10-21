import type { IResultContract } from "../../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../../contracts/validation/ValidationResult.js";
import type { ToolObservation } from "../ToolObservation.js";
import { JsonValueContract } from "../../persistence/JsonValueContract.js";
export class ToolObservationContract implements IResultContract<ToolObservation> {
  readonly id = "tool-observation"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(input: unknown): Promise<ValidationResult<ToolObservation>> {
    const checked = await this.json.validate(input);
    if (!checked.valid) return { valid: false, issues: checked.issues };
    const value = checked.value;
    if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== "operationId,toolId,toolVersion,value") return this.invalid();
    const data = value as Record<string, unknown>;
    if (typeof data.operationId !== "string" || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(data.operationId) || typeof data.toolId !== "string" || !/^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(data.toolId) ||
        typeof data.toolVersion !== "string" || !/^[a-zA-Z0-9_.-]{1,32}$/.test(data.toolVersion) || new TextEncoder().encode(JSON.stringify(data.value)).byteLength > 65536) return this.invalid();
    return { valid: true, value: value as unknown as ToolObservation };
  }
  private invalid(): ValidationResult<ToolObservation> { return { valid: false, issues: [{ path: [], code: "invalid-tool-observation", message: "Tool observation receipt is invalid." }] }; }
}
