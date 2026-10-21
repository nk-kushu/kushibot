import type { PartialProgress } from "../../src/contracts/outcomes/PartialProgress.js";
import type { ParentReviewInput } from "./ParentReviewInput.js";
export class ParentPartialWorkConsumer {
  constructor(private readonly acceptedEvidence: ReadonlySet<string>) {}
  prepare(partial: PartialProgress): ParentReviewInput {
    return Object.freeze({ acceptedEvidenceRefs: Object.freeze(partial.evidenceRefs.filter(ref => this.acceptedEvidence.has(ref))),
      remainingRequirements: Object.freeze([...partial.unresolved]) });
  }
}
