import type { IPersistenceTestHarness } from "./IPersistenceTestHarness.js";
import { verifyExecutionRecordRepository } from "./ExecutionRecordRepository.test.js";

export async function verifyPostgresqlPersistence(harness: IPersistenceTestHarness): Promise<void> {
  await verifyExecutionRecordRepository(harness);
}
