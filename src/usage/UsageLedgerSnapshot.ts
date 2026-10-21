import type { BudgetScope } from "./BudgetScope.js";
import type { BudgetReservation } from "./BudgetReservation.js";
export type UsageLedgerSnapshot = Readonly<{
  schemaVersion: 1; scopes: readonly BudgetScope[]; reservations: readonly BudgetReservation[];
}>;
