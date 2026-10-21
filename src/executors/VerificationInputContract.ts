import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { VerificationInput } from "./VerificationInput.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class VerificationInputContract implements IResultContract<VerificationInput> {
  readonly id = "verification-input"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<VerificationInput>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (row === null ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.keys(row).length !== 2 ||
        typeof row.snapshotRef !== "string" ||
        !row.snapshotRef ||
        row.snapshotRef.length > 256 ||
        !Array.isArray(row.checkIds) ||
        row.checkIds.length < 1 ||
        row.checkIds.length > 8 ||
        row.checkIds.some(id => typeof id !== "string" ||
        !/^[A-Za-z0-9_.:-]{1,128}$/.test(id)) ||
        new Set(row.checkIds).size !== row.checkIds.length) return { valid: false, issues: [{path: [],code: "INVALID_VERIFICATION_INPUT",message: "Verification input is invalid."}] };
    return { valid: true, value: checked.value as unknown as VerificationInput };
  }
}
