import type { IToolOperationJournal } from "../../src/tools/operations/IToolOperationJournal.js";
export interface IToolJournalTestHarness {
  open(scopeId: string): Promise<IToolOperationJournal>;
  close(): Promise<void>;
}
