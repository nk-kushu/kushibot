import type { DecisionEvidence } from "./DecisionEvidence.js";
export type DecisionRequest = Readonly<{ purpose: string; question: string; options: readonly string[]; evidence: readonly DecisionEvidence[] }>;
