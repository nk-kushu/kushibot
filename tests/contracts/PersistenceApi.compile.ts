import type {
  JsonValue,
  ExecutionRecord,
  StoredExecutionRecord,
  SaveExecutionRecord,
  SaveRecordReceipt,
  IExecutionRecordRepository,
  IRecordCodec,
  ISqlExecutor,
  ISqlDatabase,
  SqlValue,
  SqlResult,
  PersistenceServices,
  IPersistenceFactory,
} from "../../src/index.js";
import {
  JsonValueContract,
  ExecutionRecordContract,
  JsonRecordCodec,
  SqlitePersistenceFactory,
  PostgresqlPersistenceFactory,
  InvalidPersistenceRecordError,
  PersistenceConflictError,
  CommandIdentityConflictError,
} from "../../src/index.js";

export type PersistenceApiFixture = Readonly<{
  json: JsonValue;
  record: ExecutionRecord;
  stored: StoredExecutionRecord;
  command: SaveExecutionRecord;
  receipt: SaveRecordReceipt;
  repository: IExecutionRecordRepository;
  codec: IRecordCodec<ExecutionRecord>;
  executor: ISqlExecutor;
  database: ISqlDatabase;
  parameter: SqlValue;
  result: SqlResult;
  services: PersistenceServices;
  factory: IPersistenceFactory;
  jsonContract: typeof JsonValueContract;
  recordContract: typeof ExecutionRecordContract;
  codecClass: typeof JsonRecordCodec;
  sqliteFactory: typeof SqlitePersistenceFactory;
  postgresqlFactory: typeof PostgresqlPersistenceFactory;
  invalid: typeof InvalidPersistenceRecordError;
  conflict: typeof PersistenceConflictError;
  reused: typeof CommandIdentityConflictError;
}>;
