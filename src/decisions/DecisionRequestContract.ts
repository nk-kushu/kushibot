import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { DecisionRequest } from "./DecisionRequest.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class DecisionRequestContract implements IResultContract<DecisionRequest> {
  readonly id = "single-choice-decision-request"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(value: unknown): Promise<ValidationResult<DecisionRequest>> {
    const checked = await this.json.validate(value);
    if (!checked.valid) return { valid: false, issues: checked.issues };
    const data = checked.value;
    if (!this.record(data) || Object.keys(data).sort().join(",") !== "evidence,options,purpose,question" ||
        typeof data.purpose !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(data.purpose) || !this.text(data.question, 1024) ||
        !Array.isArray(data.options) || data.options.length < 1 || data.options.length > 32 || data.options.some(option => !this.text(option, 128)) || new Set(data.options).size !== data.options.length ||
        !Array.isArray(data.evidence) || data.evidence.length > 32 || data.evidence.some(item => !this.record(item) || Object.keys(item).sort().join(",") !== "ref,text" || !this.text(item.ref, 256) || !this.text(item.text, 1024)) ||
        new Set(data.evidence.map(item => (item as { ref: string }).ref)).size !== data.evidence.length || new TextEncoder().encode(JSON.stringify(data)).byteLength > 16384) {
      return { valid: false, issues: [{ path: [], code: "invalid-decision-request", message: "Decision request violates its bounded schema." }] };
    }
    return { valid: true, value: data as unknown as DecisionRequest };
  }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
  private text(value: unknown, max: number): value is string { return typeof value === "string" && value.trim().length > 0 && new TextEncoder().encode(value).byteLength <= max && !/[\u0000-\u001f]/.test(value); }
}
