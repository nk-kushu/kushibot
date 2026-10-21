import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { UsageLedgerSnapshot } from "./UsageLedgerSnapshot.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { UsageLedger } from "./UsageLedger.js";
import { BudgetAccountingError } from "../errors/BudgetAccountingError.js";
export class UsageLedgerSnapshotContract implements IResultContract<UsageLedgerSnapshot> {
  readonly id = "usage-ledger"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(value: unknown): Promise<ValidationResult<UsageLedgerSnapshot>> {
    const checked = await this.json.validate(value);
    if (!checked.valid) return { valid: false, issues: checked.issues };
    const data = checked.value as unknown as UsageLedgerSnapshot;
    try {
      if (data === null || typeof data !== "object" || Object.keys(data).sort().join(",") !== "reservations,schemaVersion,scopes" ||
          !Array.isArray(data.scopes) || !Array.isArray(data.reservations) ||
          data.scopes.some(scope => scope === null || typeof scope !== "object" || Object.keys(scope).sort().join(",") !== "id,limits,parentId") ||
          data.reservations.some(entry => entry === null || typeof entry !== "object" || Object.keys(entry).sort().join(",") !== "actual,operationId,requested,scopeId,status")) throw new BudgetAccountingError();
      return { valid: true, value: new UsageLedger(data).snapshot() };
    } catch (error) {
      if (!(error instanceof BudgetAccountingError)) throw error;
      return { valid: false, issues: [{ path: [], code: "invalid-usage-ledger", message: "Usage ledger snapshot is invalid." }] };
    }
  }
}
