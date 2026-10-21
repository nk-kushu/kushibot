import type { IDecisionUnit } from "../../src/decisions/IDecisionUnit.js";
import type { ModelCallControl } from "../../src/agentic/model/ModelCallControl.js";
import { ReviewSelectionPolicy } from "./ReviewSelectionPolicy.js";
export class LoginReviewExample {
  constructor(private readonly decisions: IDecisionUnit, private readonly policy: ReviewSelectionPolicy) {}
  async prepare(control: ModelCallControl) {
    const decision = await this.decisions.evaluate({ purpose: "select-review", question: "Which optional review is supported by this change?",
      options: ["authentication", "database", "none"], evidence: [{ ref: "evidence:login-change", text: "The authorized diff adds an OAuth callback handler." }] }, control);
    const selection = await this.policy.apply({ requiredChecks: ["typecheck", "authentication-security"], outcome: decision });
    return Object.freeze({ decision, selection });
  }
}
