import type { UsageAmounts } from "./UsageAmounts.js";
export type BudgetReservation = Readonly<{
  operationId: string; scopeId: string; requested: UsageAmounts;
  status: "reserved" | "unknown" | "settled"; actual: UsageAmounts | null;
}>;
