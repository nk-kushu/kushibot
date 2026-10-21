import type { IPolicy } from "../../../contracts/IPolicy.js";
import type { CompressionPolicyInput } from "./CompressionPolicyInput.js";
import type { CompressionDecision } from "./CompressionDecision.js";
export class ContiguousObservationCompressionPolicy implements IPolicy<CompressionPolicyInput, CompressionDecision> {
  async apply(input: CompressionPolicyInput): Promise<CompressionDecision> {
    const selected: string[] = [];
    const start = input.candidates.findIndex(candidate => candidate.kind === "source" || candidate.kind === "observation");
    if (start >= 0) for (const candidate of input.candidates.slice(start)) {
      if (selected.length >= input.maxSources || (candidate.kind !== "source" && candidate.kind !== "observation")) break;
      selected.push(candidate.id);
    }
    return { sourceIds: Object.freeze(selected) };
  }
}
