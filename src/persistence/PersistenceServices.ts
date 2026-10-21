import type { IExecutionRecordRepository } from "../contracts/persistence/IExecutionRecordRepository.js";
import type { ExecutionRecordSchema } from "./ExecutionRecordSchema.js";

export type PersistenceServices = Readonly<{
  schema: ExecutionRecordSchema;
  records: IExecutionRecordRepository;
}>;
