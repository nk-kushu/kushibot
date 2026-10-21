import type { IGuardCheck } from "../IGuardCheck.js";
import type { GuardCheckInput } from "../GuardCheckInput.js";
import type { IVerificationReceiptReader } from "./IVerificationReceiptReader.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
export class RecordedLintCheck implements IGuardCheck {
  readonly id = "recorded-lint"; readonly version = "1";
  constructor(private readonly receipts: IVerificationReceiptReader, private readonly receiptRef: string) {}
  async evaluate(input: GuardCheckInput, context: IExecutionContext): Promise<unknown> {
    const receipt = await this.receipts.read(this.receiptRef, input.target, context);
    const known = receipt !== null && receipt.checkId === "eslint" && receipt.checkVersion === "1" && receipt.revisionRef === input.target.revisionRef && Number.isSafeInteger(receipt.exitCode) && receipt.exitCode >= 0 && receipt.exitCode <= 255;
    return { revisionRef: input.target.revisionRef, findings: input.ruleIds.map(ruleId => ({ ruleId,
      verdict: !known ? "unknown" : receipt!.exitCode === 0 ? "pass" : "fail", evidenceRefs: known ? [receipt!.evidenceRef] : [], code: !known ? "LINT_RECEIPT_UNAVAILABLE" : receipt!.exitCode === 0 ? "LINT_PASSED" : "LINT_FAILED" })) };
  }
}
