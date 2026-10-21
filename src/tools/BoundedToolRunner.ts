import type { ITool } from "./ITool.js";
import type { ToolRunResult } from "./ToolRunResult.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import { ToolOperationError } from "../errors/ToolOperationError.js";
export class BoundedToolRunner {
  private active = false;
  constructor(private readonly clock: IClock) {}
  async run(tool: ITool, args: JsonValue, context: IExecutionContext, timeoutMs: number): Promise<ToolRunResult> {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647) throw new ToolOperationError();
    const now = this.clock.nowEpochMs();
    if (!Number.isSafeInteger(now) || now < 0) throw new ToolOperationError();
    if (this.active || context.signal.aborted || (context.deadlineEpochMs !== null && now >= context.deadlineEpochMs)) return { kind: "not-started" };
    this.active = true; const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined; let cancel = () => {};
    try {
      const cancelled = new Promise<ToolRunResult>(resolve => { cancel = () => { abort.abort(); resolve({ kind: "uncertain" }); }; context.signal.addEventListener("abort", cancel, { once: true }); });
      const bound = Math.min(timeoutMs, context.deadlineEpochMs === null ? timeoutMs : context.deadlineEpochMs - now);
      const timeout = new Promise<ToolRunResult>(resolve => { timer = setTimeout(() => { abort.abort(); resolve({ kind: "uncertain" }); }, bound); });
      const operation = Promise.resolve().then(() => tool.execute(args, Object.freeze({ ...context, signal: abort.signal }))).then<ToolRunResult, ToolRunResult>(
        value => ({ kind: "returned", value }), () => ({ kind: "uncertain" }));
      void operation.then(() => { this.active = false; }, () => { this.active = false; });
      return await Promise.race([operation, cancelled, timeout]);
    } finally { if (timer !== undefined) clearTimeout(timer); context.signal.removeEventListener("abort", cancel); }
  }
}
