import type { UsageAmounts } from "./UsageAmounts.js";
export type BudgetDenial = Readonly<{
  scopeId: string; dimension: keyof UsageAmounts; limit: number;
  consumed: number; reserved: number; requested: number;
}>;
