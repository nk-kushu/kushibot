import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { InvestigationResult } from "./InvestigationResult.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class InvestigationResultContract implements IResultContract<InvestigationResult> {
  readonly id = "workspace-investigation-result"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<InvestigationResult>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (!this.object(row) ||
        !this.keys(row,["summary","findings","unresolved"]) ||
        !this.text(row.summary,2048) ||
        !Array.isArray(row.findings) ||
        row.findings.length > 16 ||
        !this.list(row.unresolved,16,512)) return this.invalid();
    for (const finding of row.findings) if (!this.object(finding) ||
        !this.keys(finding,["text","sourceRefs"]) ||
        !this.text(finding.text,1024) ||
        !this.list(finding.sourceRefs,8,256) ||
        finding.sourceRefs.length === 0) return this.invalid();
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 32768) return this.invalid();
    return { valid: true, value: checked.value as unknown as InvestigationResult };
  }
  private object(value: unknown): value is Record<string,unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string,unknown>,keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private text(value: unknown,max: number): boolean { return typeof value === "string" && value.trim().length > 0 && value.length <= max; }
  private list(value: unknown,max: number,length: number): value is readonly string[] { return Array.isArray(value) && value.length <= max && value.every(item => this.text(item,length)) && new Set(value).size === value.length; }
  private invalid(): ValidationResult<never> { return { valid: false, issues: [{path: [],code: "INVALID_INVESTIGATION_RESULT",message: "Investigation result is invalid."}] }; }
}
