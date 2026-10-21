export class BudgetAccountingError extends Error {
  readonly code = "BUDGET_ACCOUNTING_INVALID";
  constructor() { super("Budget accounting data or transition is invalid."); this.name = "BudgetAccountingError"; }
}
