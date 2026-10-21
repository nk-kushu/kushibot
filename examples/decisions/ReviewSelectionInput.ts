import type { DecisionOutcome } from "../../src/decisions/DecisionOutcome.js";
export type ReviewSelectionInput = Readonly<{ requiredChecks: readonly string[]; outcome: DecisionOutcome }>;
