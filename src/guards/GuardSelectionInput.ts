import type { GuardDefinition } from "./GuardDefinition.js";
import type { DecisionOutcome } from "../decisions/DecisionOutcome.js";
export type GuardSelectionInput = Readonly<{ required: readonly GuardDefinition[]; optional: readonly Readonly<{ guard: GuardDefinition; outcome: DecisionOutcome }>[]; unevaluated: readonly string[] }>;
