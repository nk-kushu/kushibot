import type { StoredExecutionRecord } from "./StoredExecutionRecord.js";

export type SaveRecordReceipt = Readonly<{
  stored: StoredExecutionRecord;
  replayed: boolean;
}>;
