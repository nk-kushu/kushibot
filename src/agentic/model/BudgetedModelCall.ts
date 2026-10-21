import type { IModelGateway } from "../../models/contracts/IModelGateway.js";
import type { ModelProfile } from "../../models/ModelProfile.js";
import type { ModelRequest } from "./ModelRequest.js";
import type { ModelCallControl } from "./ModelCallControl.js";
import type { ModelCallOutcome } from "./ModelCallOutcome.js";
import type { IUsageLedgerStore } from "../../usage/IUsageLedgerStore.js";
import type { IClock } from "../../contracts/runtime/IClock.js";
import { zeroUsage } from "../../usage/zeroUsage.js";
import { ModelRequestValidator } from "./ModelRequestValidator.js";
import { ExecutionBoundaryGuard } from "../../execution-control/ExecutionBoundaryGuard.js";
export class BudgetedModelCall {
  constructor(private readonly gateway: IModelGateway, private readonly profile: ModelProfile,
    private readonly ledger: IUsageLedgerStore, private readonly budgetScopeId: string,
    private readonly clock: IClock, private readonly validator: ModelRequestValidator) {}
  async run(input: ModelRequest, control: ModelCallControl): Promise<ModelCallOutcome> {
    const request = this.validator.validate(input, this.profile);
    const guard = new ExecutionBoundaryGuard(this.clock, control.signal, control.deadlineEpochMs);
    const before = guard.check(); if (before !== null) return { status: "stopped", reason: before };
    const admitted = await this.ledger.mutate(ledger => ledger.reserve(control.operationId, this.budgetScopeId, {
      ...zeroUsage, modelCalls: 1, inputTokens: request.inputTokenUpperBound, outputTokens: request.maxOutputTokens,
    }));
    if (!admitted.admitted) return { status: "stopped", reason: { code: "limit-reached", message: "Model allowance unavailable." } };
    if (admitted.replayed) return { status: "uncertain", operationId: control.operationId };
    const afterWait = guard.check();
    if (afterWait !== null) { await this.ledger.mutate(ledger => ledger.settle(control.operationId, zeroUsage)); return { status: "stopped", reason: afterWait }; }
    let reply: import("./ModelReply.js").ModelReply;
    try { reply = await this.gateway.generate(request, control); }
    catch { await this.ledger.mutate(ledger => ledger.markUnknown(control.operationId)); return { status: "uncertain", operationId: control.operationId }; }
    if (reply.usage === null) await this.ledger.mutate(ledger => ledger.markUnknown(control.operationId));
    else await this.ledger.mutate(ledger => ledger.settle(control.operationId, { ...zeroUsage, modelCalls: 1,
      inputTokens: reply.usage!.inputTokens, outputTokens: reply.usage!.outputTokens }));
    return { status: "received", reply, stopReason: guard.check() };
  }
}
