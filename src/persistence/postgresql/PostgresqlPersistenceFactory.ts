import type { IPersistenceFactory } from "../IPersistenceFactory.js";
import type { PersistenceServices } from "../PersistenceServices.js";
import type { ISqlDatabase } from "../sql/ISqlDatabase.js";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec.js";
import type { ExecutionRecord } from "../../contracts/persistence/ExecutionRecord.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import { ExecutionRecordSchema } from "../ExecutionRecordSchema.js";
import { SqlExecutionRecordRepository } from "../SqlExecutionRecordRepository.js";
import { postgresqlExecutionRecordStatements } from "./postgresqlExecutionRecordStatements.js";

export class PostgresqlPersistenceFactory implements IPersistenceFactory {
  constructor(
    private readonly database: ISqlDatabase,
    private readonly codec: IRecordCodec<ExecutionRecord>,
    private readonly scope: ExecutionScopeRef,
  ) {}

  create(): PersistenceServices {
    return Object.freeze({
      schema: new ExecutionRecordSchema(this.database, postgresqlExecutionRecordStatements),
      records: new SqlExecutionRecordRepository(
        this.database,
        postgresqlExecutionRecordStatements,
        this.codec,
        this.scope,
      ),
    });
  }
}
