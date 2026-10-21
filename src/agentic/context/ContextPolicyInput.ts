import type { ContextCandidate } from "./ContextCandidate.js";
export type ContextPolicyInput = Readonly<{ candidates: readonly ContextCandidate[]; maxFragments: number }>;
