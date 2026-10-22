import type { ISqlExecutor } from "../../persistence/sql/ISqlExecutor.js";
import type { DebugEvent } from "./DebugEvent.js";
import type { AppendDebugEventResult } from "./AppendDebugEventResult.js";
export interface ITransactionalDebugEventWriter {
  appendWithin(transaction: ISqlExecutor, event: DebugEvent): Promise<AppendDebugEventResult>;
}
