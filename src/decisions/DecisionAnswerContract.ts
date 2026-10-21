import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { DecisionAnswer } from "./DecisionAnswer.js";
import type { DecisionRequest } from "./DecisionRequest.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class DecisionAnswerContract implements IResultContract<DecisionAnswer> {
  readonly id = "single-choice-decision-answer"; readonly version = "1";
  private readonly choices: ReadonlySet<string>;
  private readonly references: ReadonlySet<string>;
  constructor(request: DecisionRequest, private readonly json: JsonValueContract) {
    this.choices = new Set(request.options); this.references = new Set(request.evidence.map(item => item.ref));
  }
  async validate(value: unknown): Promise<ValidationResult<DecisionAnswer>> {
    const checked = await this.json.validate(value);
    if (!checked.valid) return { valid: false, issues: checked.issues };
    const data = checked.value;
    if (data === null || typeof data !== "object" || Array.isArray(data)) return this.invalid();
    const answer = data as Record<string, unknown>;
    if (!Array.isArray(answer.supportingRefs) || answer.supportingRefs.length > 32 || answer.supportingRefs.some(ref => typeof ref !== "string" || !this.references.has(ref)) || new Set(answer.supportingRefs).size !== answer.supportingRefs.length) return this.invalid();
    if (answer.kind === "answered" && Object.keys(answer).sort().join(",") === "choice,kind,supportingRefs" && typeof answer.choice === "string" && this.choices.has(answer.choice)) {
      return { valid: true, value: { kind: "answered", choice: answer.choice, supportingRefs: Object.freeze([...answer.supportingRefs]) } };
    }
    if (answer.kind === "abstained" && Object.keys(answer).sort().join(",") === "kind,supportingRefs" && answer.supportingRefs.length === 0) {
      return { valid: true, value: { kind: "abstained", supportingRefs: Object.freeze([]) } };
    }
    return this.invalid();
  }
  private invalid(): ValidationResult<DecisionAnswer> { return { valid: false, issues: [{ path: [], code: "invalid-decision-answer", message: "Decision answer is outside the allowed schema, choices, or evidence." }] }; }
}
