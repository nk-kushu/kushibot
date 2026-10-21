import type { ExecutionRecord } from "./ExecutionRecord.js";

export type StoredExecutionRecord = Readonly<{
  recordVersion: number;
  record: ExecutionRecord;
}>;
