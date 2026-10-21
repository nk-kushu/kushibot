import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { VerificationCheckResult } from "./VerificationCheckResult.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class VerificationCheckResultContract implements IResultContract<VerificationCheckResult> {
  readonly id = "verification-check-result"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<VerificationCheckResult>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (row === null ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.keys(row).length !== 6 ||
        !["checkId","checkVersion","snapshotRef","status","receiptRef","summary"].every(key => Object.prototype.hasOwnProperty.call(row,key)) ||
        typeof row.checkId !== "string" ||
        !/^[A-Za-z0-9_.:-]{1,128}$/.test(row.checkId) ||
        typeof row.checkVersion !== "string" ||
        !/^[A-Za-z0-9_.:-]{1,128}$/.test(row.checkVersion) ||
        !this.text(row.snapshotRef,256) ||
        !["passed","failed"].includes(row.status as string) ||
        !this.text(row.receiptRef,256) ||
        !this.text(row.summary,1024)) return {valid: false,issues: [{path: [],code: "INVALID_VERIFICATION_CHECK_RESULT",message: "Verification check result is invalid."}]};
    return { valid: true, value: checked.value as unknown as VerificationCheckResult };
  }
  private text(value: unknown,max: number): boolean { return typeof value === "string" && value.trim().length > 0 && value.length <= max; }
}
