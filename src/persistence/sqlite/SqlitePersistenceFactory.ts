import type { IPersistenceFactory } from "../IPersistenceFactory.js";
import type { PersistenceServices } from "../PersistenceServices.js";
import type { ISqlDatabase } from "../sql/ISqlDatabase.js";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec.js";
import type { ExecutionRecord } from "../../contracts/persistence/ExecutionRecord.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import { ExecutionRecordSchema } from "../ExecutionRecordSchema.js";
import { SqlExecutionRecordRepository } from "../SqlExecutionRecordRepository.js";
import { sqliteExecutionRecordStatements } from "./sqliteExecutionRecordStatements.js";

export class SqlitePersistenceFactory implements IPersistenceFactory {
  constructor(
    private readonly database: ISqlDatabase,
    private readonly codec: IRecordCodec<ExecutionRecord>,
    private readonly scope: ExecutionScopeRef,
  ) {}

  create(): PersistenceServices {
    return Object.freeze({
      schema: new ExecutionRecordSchema(this.database, sqliteExecutionRecordStatements),
      records: new SqlExecutionRecordRepository(
        this.database,
        sqliteExecutionRecordStatements,
        this.codec,
        this.scope,
      ),
    });
  }
}
