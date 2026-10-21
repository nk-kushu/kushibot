import type { IVerificationReceiptVerifier } from "./IVerificationReceiptVerifier.js";
import type { IVerificationTargetResolver } from "./IVerificationTargetResolver.js";
import type { VerificationCheckResult } from "./VerificationCheckResult.js";
import type { IVerificationReceiptReader } from "../guards/checks/IVerificationReceiptReader.js";
import type { IGuardTargetVerifier } from "../guards/IGuardTargetVerifier.js";
import type { IExecutionContext } from "./contracts/IExecutionContext.js";
export class RecordedVerificationReceiptVerifier implements IVerificationReceiptVerifier {
  constructor(private readonly targets: IVerificationTargetResolver, private readonly verifier: IGuardTargetVerifier, private readonly receipts: IVerificationReceiptReader) {}
  async verify(result: VerificationCheckResult, context: IExecutionContext): Promise<boolean> {
    const target = await this.targets.resolve(result.snapshotRef,context);
    if (target === null || target.workspaceId !== context.scope.workspaceId || !await this.verifier.verify(target,context)) return false;
    const receipt = await this.receipts.read(result.receiptRef,target,context);
    return receipt !== null && receipt.checkId === result.checkId && receipt.checkVersion === result.checkVersion && receipt.revisionRef === target.revisionRef && Number.isSafeInteger(receipt.exitCode) && receipt.exitCode >= 0 && receipt.exitCode <= 255 && typeof receipt.evidenceRef === "string" && receipt.evidenceRef.length > 0 && receipt.evidenceRef.length <= 256 && result.status === (receipt.exitCode === 0 ? "passed" : "failed");
  }
}
