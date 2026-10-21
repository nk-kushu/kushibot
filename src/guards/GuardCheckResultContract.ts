import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { GuardCheckResult } from "./GuardCheckResult.js";
import type { GuardCheckInput } from "./GuardCheckInput.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class GuardCheckResultContract implements IResultContract<GuardCheckResult> {
  private readonly evidence: ReadonlySet<string>;
  readonly id = "guard-check-result"; readonly version = "1";
  constructor(private readonly input: GuardCheckInput, permittedEvidenceRefs: readonly string[], private readonly json: JsonValueContract) { this.evidence = new Set(permittedEvidenceRefs); }
  async validate(raw: unknown): Promise<ValidationResult<GuardCheckResult>> {
    const checked = await this.json.validate(raw);
    if (!checked.valid) return { valid: false, issues: checked.issues };
    const value = checked.value;
    if (!this.record(value) || Object.keys(value).sort().join(",") !== "findings,revisionRef" || value.revisionRef !== this.input.target.revisionRef || !Array.isArray(value.findings) || value.findings.length !== this.input.ruleIds.length) return this.invalid();
    const ids = new Set<string>();
    for (const item of value.findings) {
      if (!this.record(item) || Object.keys(item).sort().join(",") !== "code,evidenceRefs,ruleId,verdict" || typeof item.ruleId !== "string" || !this.input.ruleIds.includes(item.ruleId) || ids.has(item.ruleId) ||
          !["pass", "fail", "unknown"].includes(String(item.verdict)) || typeof item.code !== "string" || !/^[A-Z][A-Z0-9_]{0,63}$/.test(item.code) || !Array.isArray(item.evidenceRefs) || item.evidenceRefs.length > 16 ||
          item.evidenceRefs.some(ref => typeof ref !== "string" || !this.evidence.has(ref)) || new Set(item.evidenceRefs).size !== item.evidenceRefs.length ||
          (item.verdict !== "unknown" && item.evidenceRefs.length === 0)) return this.invalid();
      ids.add(item.ruleId);
    }
    return { valid: true, value: value as unknown as GuardCheckResult };
  }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
  private invalid(): ValidationResult<GuardCheckResult> { return { valid: false, issues: [{ path: [], code: "invalid-guard-check", message: "Guard result lacks valid target-bound rule coverage or evidence." }] }; }
}
