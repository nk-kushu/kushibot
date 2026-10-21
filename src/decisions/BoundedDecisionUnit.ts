import type { IDecisionUnit } from "./IDecisionUnit.js";
import type { IDecisionProvider } from "./IDecisionProvider.js";
import type { DecisionRequest } from "./DecisionRequest.js";
import type { DecisionOutcome } from "./DecisionOutcome.js";
import type { ModelCallControl } from "../agentic/model/ModelCallControl.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import { DecisionRequestContract } from "./DecisionRequestContract.js";
import { DecisionAnswerContract } from "./DecisionAnswerContract.js";
import { DecisionRequestError } from "../errors/DecisionRequestError.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class BoundedDecisionUnit implements IDecisionUnit {
  constructor(private readonly provider: IDecisionProvider, private readonly requests: DecisionRequestContract,
    private readonly json: JsonValueContract, private readonly clock: IClock) {}
  async evaluate(input: DecisionRequest, control: ModelCallControl): Promise<DecisionOutcome> {
    const checked = await this.requests.validate(input);
    if (!checked.valid) throw new DecisionRequestError();
    const guard = new ExecutionBoundaryGuard(this.clock, control.signal, control.deadlineEpochMs);
    const before = guard.check(); if (before !== null) return { status: "stopped", reason: before };
    let result: import("./DecisionProviderResult.js").DecisionProviderResult;
    try { result = await this.provider.evaluate(checked.value, control); }
    catch { return { status: "uncertain", operationId: control.operationId }; }
    // Preserve uncertainty even if cancellation/deadline also occurs.
    if (result.status === "uncertain") return result;
    const after = guard.check(); if (after !== null) return { status: "stopped", reason: after };
    if (result.status === "stopped") return result;
    if (result.status === "unavailable") return { status: "unavailable", code: "DECISION_PROVIDER_UNAVAILABLE" };
    if (result.status === "invalid-output") return { status: "invalid-output", code: "DECISION_OUTPUT_INVALID" };
    const answer = await new DecisionAnswerContract(checked.value, this.json).validate(result.value);
    if (!answer.valid) return { status: "invalid-output", code: "DECISION_OUTPUT_INVALID" };
    if (answer.value.kind === "abstained") return { status: "abstained" };
    return { status: "answered", answer: Object.freeze(answer.value) };
  }
}
