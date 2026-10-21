import type { IExecutor } from "./contracts/IExecutor.js";
import type { IExecutionContext } from "./contracts/IExecutionContext.js";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { ToolDispatcher } from "../tools/ToolDispatcher.js";
import type { VerificationCheckRegistration } from "./VerificationCheckRegistration.js";
import type { IVerificationReceiptVerifier } from "./IVerificationReceiptVerifier.js";
import type { VerificationInput } from "./VerificationInput.js";
import type { VerificationResult } from "./VerificationResult.js";
import type { VerificationCheckResult } from "./VerificationCheckResult.js";
import { VerificationInputContract } from "./VerificationInputContract.js";
import { VerificationCheckResultContract } from "./VerificationCheckResultContract.js";
import { VerificationResultContract } from "./VerificationResultContract.js";
import { ValidatedExecutor } from "./ValidatedExecutor.js";
import { ExecutionOutcomeContract } from "../contracts/validation/ExecutionOutcomeContract.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { ExecutorContractError } from "../errors/ExecutorContractError.js";
export class VerificationExecutor implements IExecutor<VerificationInput,VerificationResult> {
  private readonly checks = new Map<string,VerificationCheckRegistration>();
  private readonly checked: ValidatedExecutor<VerificationInput,VerificationResult>;
  constructor(registrations: readonly VerificationCheckRegistration[],
    private readonly tools: Pick<ToolDispatcher,"dispatch">,
    private readonly verifier: IVerificationReceiptVerifier,
    private readonly receipts: VerificationCheckResultContract, input: VerificationInputContract, result: VerificationResultContract, json: JsonValueContract,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock) {
    if (registrations.length > 32) throw new ExecutorContractError();
    for (const registration of registrations) {
      if (![registration.checkId,registration.checkVersion,registration.toolId,registration.toolVersion].every(value => /^[A-Za-z0-9_.:-]{1,128}$/.test(value)) ||
        this.checks.has(registration.checkId)) throw new ExecutorContractError();
      this.checks.set(registration.checkId,Object.freeze({...registration}));
    }
    this.checked = new ValidatedExecutor(input,new ExecutionOutcomeContract(result,json),{execute: (value,context) => this.run(value,context)},json,clock);
  }
  execute(input: VerificationInput, context: IExecutionContext): Promise<ExecutionOutcome<VerificationResult>> { return this.checked.execute(input,context); }
  private async run(input: VerificationInput, context: IExecutionContext): Promise<ExecutionOutcome<VerificationResult>> {
    if (input.checkIds.some(id => !this.checks.has(id))) return { status: "failed", error: { code: "CHECK_NOT_REGISTERED", message: "Requested verification check is not registered." }, partial: { summary: "No verification checks started.", evidenceRefs: [], artifactRefs: [], unresolved: [...input.checkIds] }, pendingOperationRefs: [] };
    const saved: VerificationCheckResult[] = [];
    const guard = new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);
    for (const checkId of input.checkIds) {
      const stop = guard.check(); if (stop !== null) return this.stopped(stop,saved,input);
      const registration = this.checks.get(checkId)!;
      const operationId = this.ids.nextId();
      const child: IExecutionContext = Object.freeze({ ...context, identity: Object.freeze({...context.identity,operationId,parentOperationId:context.identity.operationId}) });
      const dispatched = await this.tools.dispatch({operationId,toolId:registration.toolId,arguments:{checkId,checkVersion:registration.checkVersion,snapshotRef:input.snapshotRef}},child);
      if (dispatched.status === "uncertain") return this.stopped({code:"no-progress",message:"Verification operation requires reconciliation."},saved,input,[dispatched.operationId]);
      if (dispatched.status === "stopped") return this.stopped(dispatched.reason,saved,input);
      if (dispatched.status === "rejected") return {status:"failed",error:{code:"VERIFICATION_TOOL_REJECTED",message:"Verification check could not start."},partial:this.partial(saved,input),pendingOperationRefs:[]};
      const receipt = await this.receipts.validate(dispatched.observation.value);
      if (dispatched.observation.operationId !== operationId ||
        dispatched.observation.toolId !== registration.toolId ||
        dispatched.observation.toolVersion !== registration.toolVersion ||
        !receipt.valid ||
        receipt.value.checkId !== checkId ||
        receipt.value.checkVersion !== registration.checkVersion ||
        receipt.value.snapshotRef !== input.snapshotRef ||
        !await this.verifier.verify(receipt.value,child)) return this.stopped({code:"no-progress",message:"Verification evidence cannot be verified."},saved,input,[operationId]);
      saved.push(receipt.value);
      const after = guard.check(); if (after !== null) return this.stopped(after,saved,input);
    }
    return { status:"completed",result:Object.freeze({snapshotRef:input.snapshotRef,passed:saved.every(receipt => receipt.status === "passed"),checks:Object.freeze(saved)}) };
  }
  private partial(saved: readonly VerificationCheckResult[], input: VerificationInput): import("../contracts/outcomes/PartialProgress.js").PartialProgress { return {summary:saved.map(receipt => receipt.checkId + ": " + receipt.status).join("; "),evidenceRefs:[...new Set(saved.map(receipt => receipt.receiptRef))],artifactRefs:[],unresolved:[...saved.filter(receipt => receipt.status === "failed").map(receipt => "Check failed: " + receipt.checkId),...input.checkIds.filter(id => !saved.some(receipt => receipt.checkId === id)).map(id => "Check incomplete: " + id)]}; }
  private stopped(reason: ExecutionStopReason, saved: readonly VerificationCheckResult[], input: VerificationInput, pending: readonly string[] = []): ExecutionOutcome<VerificationResult> { return {status:"stopped",reason,partial:this.partial(saved,input),pendingOperationRefs:pending}; }
}
