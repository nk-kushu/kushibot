import type { BudgetReservation } from "./BudgetReservation.js";
import type { BudgetDenial } from "./BudgetDenial.js";
export type BudgetReservationDecision =
  | Readonly<{ admitted: true; replayed: boolean; reservation: BudgetReservation }>
  | Readonly<{ admitted: false; denial: BudgetDenial }>;
