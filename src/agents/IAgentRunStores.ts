import type { IWorkflowRunStore } from "../workflows/IWorkflowRunStore.js";
import type { IUsageLedgerStore } from "../usage/IUsageLedgerStore.js";
import type { ISessionJournal } from "../agentic/sessions/ISessionJournal.js";

/** A fresh set per invocation; persistent implementations must isolate each run. */
export interface IAgentRunStores {
  readonly workflow: IWorkflowRunStore;
  readonly usage: IUsageLedgerStore;
  readonly journal: ISessionJournal;
  readonly readJournal?: () => Promise<readonly unknown[]>;
}
