import { UsageLedger } from "../../usage/UsageLedger.js";
import type { IUsageLedgerStore } from "../../usage/IUsageLedgerStore.js";
import type { UsageLedgerSnapshot } from "../../usage/UsageLedgerSnapshot.js";

export class InMemoryAgentUsageStore implements IUsageLedgerStore {
  private ledger: UsageLedger | undefined;
  async initialize(initial: UsageLedgerSnapshot): Promise<void> {
    if (this.ledger) throw new Error("Usage store already initialized.");
    this.ledger = new UsageLedger(initial);
  }
  async read(): Promise<UsageLedgerSnapshot> {
    return structuredClone(this.current().snapshot());
  }
  async mutate<T>(change: (ledger: UsageLedger) => T): Promise<T> {
    // Mutations are synchronous; commit only a successfully changed aggregate.
    const ledger = new UsageLedger(this.current().snapshot());
    const result = change(ledger);
    this.ledger = ledger;
    return result;
  }
  private current(): UsageLedger {
    if (!this.ledger) throw new Error("Usage store not initialized.");
    return this.ledger;
  }
}
