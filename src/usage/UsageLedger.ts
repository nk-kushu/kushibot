import type { UsageAmounts } from "./UsageAmounts.js";
import type { BudgetScope } from "./BudgetScope.js";
import type { BudgetReservation } from "./BudgetReservation.js";
import type { UsageLedgerSnapshot } from "./UsageLedgerSnapshot.js";
import type { BudgetReservationDecision } from "./BudgetReservationDecision.js";
import { usageDimensions } from "./usageDimensions.js";
import { zeroUsage } from "./zeroUsage.js";
import { BudgetAccountingError } from "../errors/BudgetAccountingError.js";

export class UsageLedger {
  private readonly scopes = new Map<string, BudgetScope>();
  private readonly reservations = new Map<string, BudgetReservation>();
  constructor(snapshot: UsageLedgerSnapshot) {
    if (snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.scopes) || !Array.isArray(snapshot.reservations) ||
        snapshot.scopes.length < 1 || snapshot.scopes.length > 256 || snapshot.reservations.length > 10000) this.invalid();
    for (const scope of snapshot.scopes) this.addScope(scope);
    if (snapshot.scopes.filter(item => item.parentId === null).length !== 1) this.invalid();
    for (const entry of snapshot.reservations) {
      this.id(entry.operationId); this.scope(entry.scopeId); this.amounts(entry.requested);
      if (this.reservations.has(entry.operationId) || !["reserved", "unknown", "settled"].includes(entry.status)) this.invalid();
      if (entry.status === "settled") this.amounts(entry.actual);
      else if (entry.actual !== null) this.invalid();
      this.reservations.set(entry.operationId, Object.freeze({ ...entry, requested: Object.freeze({ ...entry.requested }), actual: entry.actual === null ? null : Object.freeze({ ...entry.actual }) }));
    }
    // Reject overflow in restored totals, but retain real over-limit usage.
    for (const scope of this.scopes.values()) this.totals(scope.id);
  }
  addScope(input: BudgetScope): void {
    this.id(input.id); this.amounts(input.limits);
    if (this.scopes.has(input.id) || this.scopes.size >= 256) this.invalid();
    if (input.parentId === null) { if (this.scopes.size !== 0) this.invalid(); }
    else {
      const parent = this.scope(input.parentId);
      if (usageDimensions.some(key => input.limits[key] > parent.limits[key])) this.invalid();
    }
    this.scopes.set(input.id, Object.freeze({ ...input, limits: Object.freeze({ ...input.limits }) }));
  }
  reserve(operationId: string, scopeId: string, requested: UsageAmounts): BudgetReservationDecision {
    this.id(operationId); this.scope(scopeId); this.amounts(requested);
    const old = this.reservations.get(operationId);
    if (old !== undefined) {
      if (old.scopeId !== scopeId || !this.equal(old.requested, requested)) this.invalid();
      return { admitted: true, replayed: true, reservation: old };
    }
    if (this.reservations.size >= 10000) this.invalid();
    for (const ancestor of this.ancestors(scopeId)) {
      const totals = this.totals(ancestor.id);
      for (const dimension of usageDimensions) {
        const consumed = totals.consumed[dimension], reserved = totals.reserved[dimension];
        if (requested[dimension] > ancestor.limits[dimension] - consumed - reserved) {
          return { admitted: false, denial: { scopeId: ancestor.id, dimension, limit: ancestor.limits[dimension], consumed, reserved, requested: requested[dimension] } };
        }
      }
    }
    const reservation: BudgetReservation = Object.freeze({ operationId, scopeId, requested: Object.freeze({ ...requested }), status: "reserved", actual: null });
    this.reservations.set(operationId, reservation);
    return { admitted: true, replayed: false, reservation };
  }
  markUnknown(operationId: string): void {
    const entry = this.reservation(operationId);
    if (entry.status === "settled") this.invalid();
    this.reservations.set(operationId, Object.freeze({ ...entry, status: "unknown" }));
  }
  settle(operationId: string, actual: UsageAmounts): void {
    this.amounts(actual);
    const entry = this.reservation(operationId);
    if (entry.status === "settled") { if (!this.equal(entry.actual as UsageAmounts, actual)) this.invalid(); return; }
    const replacement: BudgetReservation = Object.freeze({ ...entry, status: "settled", actual: Object.freeze({ ...actual }) });
    this.reservations.set(operationId, replacement);
    try { for (const ancestor of this.ancestors(entry.scopeId)) this.totals(ancestor.id); }
    catch (error) { this.reservations.set(operationId, entry); throw error; }
  }
  totals(scopeId: string): Readonly<{ consumed: UsageAmounts; reserved: UsageAmounts }> {
    this.scope(scopeId);
    const consumed = { ...zeroUsage }, reserved = { ...zeroUsage };
    for (const entry of this.reservations.values()) {
      if (!this.ancestors(entry.scopeId).some(scope => scope.id === scopeId)) continue;
      const destination = entry.status === "settled" ? consumed : reserved;
      const amount = entry.status === "settled" ? entry.actual as UsageAmounts : entry.requested;
      for (const key of usageDimensions) {
        const sum = destination[key] + amount[key];
        if (!Number.isSafeInteger(sum)) this.invalid();
        destination[key] = sum;
      }
    }
    return Object.freeze({ consumed: Object.freeze(consumed), reserved: Object.freeze(reserved) });
  }
  snapshot(): UsageLedgerSnapshot { return Object.freeze({ schemaVersion: 1, scopes: Object.freeze([...this.scopes.values()]), reservations: Object.freeze([...this.reservations.values()]) }); }
  private ancestors(id: string): readonly BudgetScope[] {
    const result: BudgetScope[] = []; let current: BudgetScope | undefined = this.scope(id);
    while (current !== undefined) { result.push(current); current = current.parentId === null ? undefined : this.scope(current.parentId); }
    return result;
  }
  private scope(id: string): BudgetScope { const value = this.scopes.get(id); if (value === undefined) return this.invalid(); return value; }
  private reservation(id: string): BudgetReservation { const value = this.reservations.get(id); if (value === undefined) return this.invalid(); return value; }
  private equal(a: UsageAmounts, b: UsageAmounts): boolean { return usageDimensions.every(key => a[key] === b[key]); }
  private amounts(value: unknown): asserts value is UsageAmounts {
    if (typeof value !== "object" || value === null || Array.isArray(value)) this.invalid();
    const record = value as Record<string, unknown>;
    if (Object.keys(record).length !== usageDimensions.length || usageDimensions.some(key => typeof record[key] !== "number" || !Number.isSafeInteger(record[key]) || (record[key] as number) < 0)) this.invalid();
  }
  private id(value: unknown): void { if (typeof value !== "string" || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(value)) this.invalid(); }
  private invalid(): never { throw new BudgetAccountingError(); }
}
