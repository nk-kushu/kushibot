import { ScopedDebugRecorder } from "../../src/events/debug/ScopedDebugRecorder.js";
import { LoggingController } from "../../src/events/debug/LoggingController.js";
import { BoundedDebugPublisher } from "../../src/events/debug/BoundedDebugPublisher.js";
import { DebugEventFactory } from "../../src/events/debug/DebugEventFactory.js";
import { DebugPayloadSanitizer } from "../../src/events/debug/DebugPayloadSanitizer.js";
import { DebugHealthCounter } from "../../src/events/debug/DebugHealthCounter.js";
import type { DebugEvent } from "../../src/events/debug/DebugEvent.js";

export async function checkDebugRecorder(): Promise<void> {
  const events: DebugEvent[] = [];
  const logging = new LoggingController({ enabled: true, level: "debug" });
  const health = new DebugHealthCounter();
  const publisher = new BoundedDebugPublisher([{ id: "test", sink: { async send(event) { events.push(event); } } }], 8, 100, health);
  let id = 0;
  const ids = { nextId: () => `id-${++id}` };
  let elapsed = 0;
  const trace = { traceId: "trace", spanId: "root", parentSpanId: null, causationEventId: null };
  const factory = new DebugEventFactory({ scopeId: "scope", projectId: "project" }, { operationId: "operation" },
    "test", { nowEpochMs: () => 1000 }, ids, new DebugPayloadSanitizer());
  const recorder = new ScopedDebugRecorder(logging, publisher, factory, trace, ids, { nowMs: () => elapsed }, health);
  const expected = { secret: "must-not-be-logged" };
  const result = await recorder.operation("inspect", async () => { elapsed += 25; return expected; });
  if (result !== expected) throw new Error("Callback result changed.");
  await publisher.drain();
  if (events.length !== 2 || events[1].payload.durationMs !== 25 || events[1].trace.causationEventId !== events[0].eventId) throw new Error("Span correlation failed.");
  const original = new Error("private failure details");
  try { await recorder.operation("inspect", async () => { throw original; }); throw new Error("Missing failure."); }
  catch (error) { if (error !== original) throw new Error("Original error changed."); }
  await publisher.drain();
  recorder.event("progress.reported", "info", { summary: "private message", rawPrompt: "private prompt", password: "secret", count: 1 });
  await publisher.drain();
  const payload = events[events.length - 1].payload;
  if (JSON.stringify(payload) !== '{"count":1}' || JSON.stringify(events).includes("private")) throw new Error("Payload leakage.");
  // Metrics keep only finite numbers under safe names: measurements, never content.
  recorder.event("progress.reported", "debug", { metrics: { bytes: 12, "obs.tool.read_file": 7, text: "private", Bad: 1, nan: Number.NaN } });
  await publisher.drain();
  if (JSON.stringify(events[events.length - 1].payload) !== '{"metrics":{"bytes":12,"obs.tool.read_file":7}}') throw new Error("Metrics were not sanitized.");
  logging.setEnabled(false);
  logging.setLevel("error");
  const before = events.length;
  let executed = false;
  await recorder.operation("inspect", async () => { executed = true; });
  await publisher.drain();
  if (!executed || events.length !== before || logging.snapshot().enabled) throw new Error("Disabled recorder changed work or emitted.");
}
