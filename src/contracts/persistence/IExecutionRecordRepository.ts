import type { StoredExecutionRecord } from "./StoredExecutionRecord.js";
import type { SaveExecutionRecord } from "./SaveExecutionRecord.js";
import type { SaveRecordReceipt } from "./SaveRecordReceipt.js";

export interface IExecutionRecordRepository {
  load(executionId: string): Promise<StoredExecutionRecord | null>;
  save(command: SaveExecutionRecord): Promise<SaveRecordReceipt>;
}
