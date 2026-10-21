import type { DebugEvent } from "./DebugEvent.js";
import type { DebugSinkRegistration } from "./DebugSinkRegistration.js";
import type { IDebugHealthReporter } from "./IDebugHealthReporter.js";
import type { DebugHealthCode } from "./DebugHealthCode.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";

export class BoundedDebugPublisher {
  private readonly sinks: readonly DebugSinkRegistration[];
  private readonly queue: DebugEvent[] = [];
  private readonly quarantined = new Set<string>();
  private worker: Promise<void> | null = null;
  private active = false;
  constructor(sinks: readonly DebugSinkRegistration[], private readonly maxPending: number,
    private readonly timeoutMs: number, private readonly health: IDebugHealthReporter) {
    if (!Number.isSafeInteger(maxPending) || maxPending < 1 || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647 ||
        sinks.length > 32 || sinks.some(item => !/^[a-zA-Z0-9_.-]{1,64}$/.test(item.id)) ||
        new Set(sinks.map(item => item.id)).size !== sinks.length) throw new ConfigurationError("Invalid debug delivery bounds or registrations.");
    this.sinks = Object.freeze(sinks.map(item => Object.freeze({ ...item })));
  }
  tryPublish(event: DebugEvent): boolean {
    if (this.queue.length + Number(this.active) >= this.maxPending) { this.report("queue-full"); return false; }
    this.queue.push(event);
    this.start();
    return true;
  }
  async drain(): Promise<void> { while (this.worker !== null) await this.worker; }

  private start(): void {
    if (this.worker !== null) return;
    const worker = this.run().catch(() => {
      this.active = false; this.queue.length = 0; this.report("delivery-failed");
      for (const item of this.sinks) this.quarantined.add(item.id);
    });
    this.worker = worker;
    void worker.then(() => {
      this.worker = null;
      if (this.queue.length > 0) this.start();
    });
  }
  private async run(): Promise<void> {
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (event === undefined) break;
      this.active = true;
      for (const subscription of this.sinks) {
        if (this.quarantined.has(subscription.id)) { this.report("delivery-quarantined"); continue; }
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const delivery = Promise.resolve().then(() => subscription.sink.send(event, controller.signal)).then(
          () => "delivered" as const, () => "failed" as const,
        );
        const timeout = new Promise<"timeout">(resolve => { timer = setTimeout(() => resolve("timeout"), this.timeoutMs); });
        const result = await Promise.race([delivery, timeout]);
        if (timer !== undefined) clearTimeout(timer);
        if (result !== "delivered") {
          controller.abort();
          this.quarantined.add(subscription.id);
          this.report(result === "timeout" ? "delivery-timeout" : "delivery-failed");
        }
      }
      this.active = false;
    }
  }
  private report(code: DebugHealthCode): void {
    try { this.health.record(code); } catch { /* Optional health reporting cannot recurse or fail the task. */ }
  }
}
