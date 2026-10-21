import type { IUsageLedgerStore } from "../../src/usage/IUsageLedgerStore.js";
import type { ExecutionOutcome } from "../../src/contracts/outcomes/ExecutionOutcome.js";
import type { ParentReviewInput } from "./ParentReviewInput.js";
import { zeroUsage } from "../../src/usage/zeroUsage.js";
import { ExecutionLimitPolicy } from "../../src/execution-control/ExecutionLimitPolicy.js";
import { PartialOutcomeFactory } from "../../src/execution-control/PartialOutcomeFactory.js";
export class LoginInvestigationExample {
  constructor(private readonly store: IUsageLedgerStore, private readonly stops: PartialOutcomeFactory,
    private readonly policy: ExecutionLimitPolicy) {}
  async run(): Promise<ExecutionOutcome<ParentReviewInput>> {
    const decision = await this.store.mutate(ledger => ledger.reserve("login-check-third", "investigation", { ...zeroUsage, toolCalls: 1 }));
    if (decision.admitted) throw new Error("Example requires the two-call fixture budget to be exhausted.");
    const instruction = await this.policy.apply(Object.freeze({ denial: Object.freeze({ ...decision.denial }) }));
    // These are fixture references assumed already saved and authorized by the example's host.
    return this.stops.stopped(instruction.reason, { partial: {
      summary: "Located the login handler and its existing tests. Verification is unfinished.",
      evidenceRefs: ["evidence:login-handler", "evidence:login-tests"], artifactRefs: ["artifact:investigation-report"],
      unresolved: ["Run the login verification checks."],
    }, pendingOperationRefs: [] });
  }
}
