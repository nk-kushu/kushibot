import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { VerificationResult } from "./VerificationResult.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { VerificationCheckResultContract } from "./VerificationCheckResultContract.js";
export class VerificationResultContract implements IResultContract<VerificationResult> {
  readonly id = "verification-result"; readonly version = "1";
  constructor(private readonly json: JsonValueContract, private readonly receipts: VerificationCheckResultContract) {}
  async validate(raw: unknown): Promise<ValidationResult<VerificationResult>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (row === null ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.keys(row).length !== 3 ||
        typeof row.snapshotRef !== "string" ||
        !row.snapshotRef ||
        row.snapshotRef.length > 256 ||
        typeof row.passed !== "boolean" ||
        !Array.isArray(row.checks) ||
        row.checks.length < 1 ||
        row.checks.length > 8) return this.invalid();
    const values = [];
    for (const rawReceipt of row.checks) { const receipt = await this.receipts.validate(rawReceipt); if (!receipt.valid ||
        receipt.value.snapshotRef !== row.snapshotRef) return this.invalid(); values.push(receipt.value); }
    if (new Set(values.map(value => value.checkId)).size !== values.length || row.passed !== values.every(value => value.status === "passed")) return this.invalid();
    return { valid: true, value: Object.freeze({ snapshotRef: row.snapshotRef, passed: row.passed, checks: Object.freeze(values) }) };
  }
  private invalid(): ValidationResult<never> { return {valid: false,issues: [{path: [],code: "INVALID_VERIFICATION_RESULT",message: "Verification result is invalid."}]}; }
}
