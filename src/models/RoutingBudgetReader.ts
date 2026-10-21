import type { IUsageLedgerStore } from "../usage/IUsageLedgerStore.js";
import type { RoutingBudgetView } from "./RoutingBudgetView.js";
import { UsageLedger } from "../usage/UsageLedger.js";
import { usageDimensions } from "../usage/usageDimensions.js";
import { zeroUsage } from "../usage/zeroUsage.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";
export class RoutingBudgetReader {
  constructor(private readonly store: IUsageLedgerStore, private readonly scopeId: string) {}
  async read(): Promise<RoutingBudgetView> {
    const snapshot = await this.store.read(); const ledger = new UsageLedger(snapshot);
    const scopes = new Map(snapshot.scopes.map(scope => [scope.id, scope]));
    let current = scopes.get(this.scopeId); if (current === undefined) throw new ConfigurationError("Routing budget scope is unknown.");
    const available = { ...zeroUsage }; for (const key of usageDimensions) available[key] = Number.MAX_SAFE_INTEGER;
    while (current !== undefined) {
      const totals = ledger.totals(current.id);
      for (const key of usageDimensions) available[key] = Math.min(available[key], Math.max(0, current.limits[key] - totals.consumed[key] - totals.reserved[key]));
      current = current.parentId === null ? undefined : scopes.get(current.parentId);
    }
    return Object.freeze({ available: Object.freeze(available) });
  }
}
