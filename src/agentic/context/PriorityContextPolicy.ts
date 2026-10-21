import type { IPolicy } from "../../contracts/IPolicy.js";
import type { ContextPolicyInput } from "./ContextPolicyInput.js";
import type { ContextPolicyDecision } from "./ContextPolicyDecision.js";
export class PriorityContextPolicy implements IPolicy<ContextPolicyInput, ContextPolicyDecision> {
  async apply(input: ContextPolicyInput): Promise<ContextPolicyDecision> {
    const ordered = [...input.candidates].sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return Object.freeze({ orderedOptionalIds: Object.freeze(ordered.slice(0, input.maxFragments).map(candidate => candidate.id)) });
  }
}
