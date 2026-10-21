import type { UsageAmounts } from "./UsageAmounts.js";
export type BudgetScope = Readonly<{ id: string; parentId: string | null; limits: UsageAmounts }>;
