import type { IPolicy } from "../../src/contracts/IPolicy.js";
import type { ReviewSelectionInput } from "./ReviewSelectionInput.js";
import type { ReviewSelection } from "./ReviewSelection.js";
export class ReviewSelectionPolicy implements IPolicy<ReviewSelectionInput, ReviewSelection> {
  private readonly choices: ReadonlyMap<string, readonly string[]>;
  private readonly fallback: readonly string[];
  constructor(choices: ReadonlyMap<string, readonly string[]>, fallback: readonly string[]) {
    this.choices = new Map([...choices].map(([choice, checks]) => [choice, Object.freeze([...checks])]));
    this.fallback = Object.freeze([...fallback]);
  }
  async apply(input: ReviewSelectionInput): Promise<ReviewSelection> {
    const recommendation = input.outcome.status === "answered" ? this.choices.get(input.outcome.answer.choice) : undefined;
    return Object.freeze({ requiredChecks: Object.freeze([...new Set(input.requiredChecks)]),
      additionalChecks: Object.freeze([...new Set(recommendation ?? this.fallback)]), source: recommendation === undefined ? "fallback" : "decision" });
  }
}
