import type { IResultContract, ValidationResult } from "../../src/index.js";
import { JsonValueContract } from "../../src/index.js";
import type { LoginSpecificationResult } from "./LoginSpecificationResult.js";
export class LoginSpecificationContract implements IResultContract<LoginSpecificationResult> {
  readonly id = "login-specification"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<LoginSpecificationResult>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (row === null ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.keys(row).length !== 5 ||
        !["summary","requirements","acceptanceCriteria","sourceRefs","unresolved"].every(key => Object.prototype.hasOwnProperty.call(row,key)) ||
        typeof row.summary !== "string" ||
        !row.summary.trim() ||
        row.summary.length > 2048 ||
        !this.list(row.requirements,16,512) ||
        row.requirements.length < 1 ||
        !this.list(row.acceptanceCriteria,16,512) ||
        row.acceptanceCriteria.length < 1 ||
        !this.list(row.sourceRefs,16,256) ||
        !this.list(row.unresolved,16,512)) return {valid:false,issues:[{path:[],code:"INVALID_LOGIN_SPECIFICATION",message:"Login specification is invalid."}]};
    return {valid:true,value:checked.value as unknown as LoginSpecificationResult};
  }
  private list(value: unknown,max: number,length: number): value is readonly string[] { return Array.isArray(value) && value.length <= max && value.every(item => typeof item === "string" && item.trim().length > 0 && item.length <= length) && new Set(value).size === value.length; }
}
