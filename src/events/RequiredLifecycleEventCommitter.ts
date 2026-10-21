import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase.js";
import type { ISqlExecutor } from "../persistence/sql/ISqlExecutor.js";
import type { ITransactionalDebugEventWriter } from "./ITransactionalDebugEventWriter.js";
import type { DebugEvent } from "./DebugEvent.js";
import type { RequiredEventCommitResult } from "./RequiredEventCommitResult.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";
export class RequiredLifecycleEventCommitter {
  constructor(private readonly database: ISqlDatabase, private readonly writer: ITransactionalDebugEventWriter) {}
  commit<TValue>(event: DebugEvent, change: (tx: ISqlExecutor) => Promise<TValue>): Promise<RequiredEventCommitResult<TValue>> {
    if (event.channel !== "lifecycle" || event.type !== "state.persisted") return Promise.reject(new ConfigurationError("Required state event expected."));
    return this.database.transaction(async tx => {
      const saved = await this.writer.appendWithin(tx, event);
      if (saved.replayed) return { applied: false, recorded: saved.recorded };
      const value = await change(tx);
      return { applied: true, value, recorded: saved.recorded };
    });
  }
}
