import type { ISqlDatabase, ExecutionRecord } from "../../src/index.js";
import {
  JsonValueContract,
  JsonRecordCodec,
  ExecutionRecordContract,
  ExecutionIdentityContract,
  FrameworkConfigurationContract,
  SqlitePersistenceFactory,
  ExecutionLifecycle,
  workflowRunLifecycle,
} from "../../src/index.js";

export async function runPersistenceExample(database: ISqlDatabase): Promise<void> {
  const scope = { scopeId: "example-scope", projectId: "example-project" };
  const json = new JsonValueContract();
  const codec = new JsonRecordCodec(new ExecutionRecordContract(
    json,
    new ExecutionIdentityContract(),
    new FrameworkConfigurationContract(),
  ), json, 65536);
  const services = new SqlitePersistenceFactory(database, codec, scope).create();
  await services.schema.initialize();
  const lifecycle = ExecutionLifecycle.create(workflowRunLifecycle, "example-run");
  const record: ExecutionRecord = {
    schemaVersion: 1,
    scope,
    identity: { operationId: "example-operation", runId: "example-run" },
    lifecycle: lifecycle.snapshot(),
    definition: { id: "example-workflow", version: "1" },
    configuration: {
      logEnabled: false,
      logLevel: "info",
      maxIterations: 6,
      maxSubAgents: 2,
      maxSubAgentDepth: 1,
    },
    registrations: [],
    sourceRefs: [],
    checkpointRef: null,
    outcome: null,
  };
  await services.records.save({ commandId: "create-example", expectedVersion: 0, record });
  lifecycle.transition("active");
  await services.records.save({
    commandId: "start-example",
    expectedVersion: 1,
    record: { ...record, lifecycle: lifecycle.snapshot() },
  });
  const loaded = await services.records.load("example-run");
  if (loaded === null) throw new Error("Expected saved example record.");
  const restored = await ExecutionLifecycle.restore(workflowRunLifecycle, loaded.record.lifecycle);
  console.log({ recordVersion: loaded.recordVersion, restored: restored.snapshot() });
}
