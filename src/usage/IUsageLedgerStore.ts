import type { UsageLedger } from "./UsageLedger.js";
import type { UsageLedgerSnapshot } from "./UsageLedgerSnapshot.js";
export interface IUsageLedgerStore {
  initialize(initial: UsageLedgerSnapshot): Promise<void>;
  mutate<TValue>(change: (ledger: UsageLedger) => TValue): Promise<TValue>;
  read(): Promise<UsageLedgerSnapshot>;
}
