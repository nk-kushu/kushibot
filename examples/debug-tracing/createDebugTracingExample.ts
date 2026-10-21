import type { ISqlDatabase } from "../../src/persistence/sql/ISqlDatabase.js";
import type { IClock } from "../../src/contracts/runtime/IClock.js";
import type { IIdGenerator } from "../../src/contracts/runtime/IIdGenerator.js";
import type { IMonotonicClock } from "../../src/events/IMonotonicClock.js";
import { LoggingController } from "../../src/events/LoggingController.js";
import { EnvironmentLoggingOptionsReader } from "../../src/events/EnvironmentLoggingOptionsReader.js";
import { DebugHealthCounter } from "../../src/events/DebugHealthCounter.js";
import { DebugPayloadSanitizer } from "../../src/events/DebugPayloadSanitizer.js";
import { DebugEventFactory } from "../../src/events/DebugEventFactory.js";
import { BoundedDebugPublisher } from "../../src/events/BoundedDebugPublisher.js";
import { ScopedDebugRecorder } from "../../src/events/ScopedDebugRecorder.js";
import { DebugEventContract } from "../../src/events/DebugEventContract.js";
import { SqlDebugEventStore } from "../../src/events/SqlDebugEventStore.js";
import { sqliteDebugEventStatements } from "../../src/events/sqliteDebugEventStatements.js";
import { StoredDebugEventSink } from "../../src/events/StoredDebugEventSink.js";
import { RequiredLifecycleEventCommitter } from "../../src/events/RequiredLifecycleEventCommitter.js";
import { JsonRecordCodec } from "../../src/persistence/JsonRecordCodec.js";
import { JsonValueContract } from "../../src/persistence/JsonValueContract.js";
import { ExecutionIdentityContract } from "../../src/contracts/runtime/ExecutionIdentityContract.js";

export async function createDebugTracingExample(database: ISqlDatabase, clock: IClock,
  ids: IIdGenerator, monotonic: IMonotonicClock, environment: Readonly<Record<string, string | undefined>>) {
  const scope = { scopeId: "demo-scope", projectId: "demo-project" };
  const identity = { operationId: "demo-operation", runId: "demo-run" };
  const trace = { traceId: ids.nextId(), spanId: ids.nextId(), parentSpanId: null, causationEventId: null };
  const logging = new LoggingController(new EnvironmentLoggingOptionsReader(environment).read({ enabled: true, level: "debug" }));
  const health = new DebugHealthCounter();
  const json = new JsonValueContract();
  const codec = new JsonRecordCodec(new DebugEventContract(json, new ExecutionIdentityContract()), json, 16384);
  const store = new SqlDebugEventStore(database, sqliteDebugEventStatements, scope, codec, clock, 100);
  await store.initialize();
  const publisher = new BoundedDebugPublisher([{ id: "database", sink: new StoredDebugEventSink(store) }], 128, 1000, health);
  const factory = new DebugEventFactory(scope, identity, "demo-worker", clock, ids, new DebugPayloadSanitizer(["Investigation started."]));
  const recorder = new ScopedDebugRecorder(logging, publisher, factory, trace, ids, monotonic, health);
  const required = new RequiredLifecycleEventCommitter(database, store);
  return { logging, health, publisher, factory, recorder, store, required, trace };
}
