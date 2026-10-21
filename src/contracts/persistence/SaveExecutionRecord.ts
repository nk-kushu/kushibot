import type { ExecutionRecord } from "./ExecutionRecord.js";

export type SaveExecutionRecord = Readonly<{
  commandId: string;
  expectedVersion: number;
  record: ExecutionRecord;
}>;
