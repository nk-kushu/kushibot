export type ExecutionRecordStatements = Readonly<{
  schema: readonly string[];
  readSchemaVersion: string;
  installSchemaVersion: string;
  selectRecord: string;
  insertRecord: string;
  updateRecord: string;
  selectReceipt: string;
  insertReceipt: string;
}>;
