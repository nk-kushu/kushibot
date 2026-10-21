import type { IPersistenceTestHarness } from "./IPersistenceTestHarness.js";
import type { ExecutionRecord } from "../../src/contracts/persistence/ExecutionRecord.js";
import { createExecutionRecord } from "../fixtures/createExecutionRecord.js";
import { ExecutionLifecycle } from "../../src/domain/lifecycle/ExecutionLifecycle.js";
import { workflowRunLifecycle } from "../../src/domain/lifecycle/workflowRunLifecycle.js";
import { PersistenceConflictError } from "../../src/errors/PersistenceConflictError.js";
import { CommandIdentityConflictError } from "../../src/errors/CommandIdentityConflictError.js";

export async function verifyExecutionRecordRepository(harness: IPersistenceTestHarness): Promise<void> {
  const scope = { scopeId: "fixture-scope", projectId: "fixture-project" };
  try {
    const services = await harness.open(scope);
    await services.schema.initialize();
    await services.schema.initialize();
    const initial = createExecutionRecord(scope, "fixture-run");
    const created = await services.records.save({ commandId: "create-1", expectedVersion: 0, record: initial });
    const replay = await services.records.save({ commandId: "create-1", expectedVersion: 0, record: initial });
    if (created.stored.recordVersion !== 1 || created.replayed || !replay.replayed) {
      throw new Error("Create/replay failed.");
    }
    const lifecycle = await ExecutionLifecycle.restore(workflowRunLifecycle, initial.lifecycle);
    lifecycle.transition("active");
    const active = { ...initial, lifecycle: lifecycle.snapshot() };
    const updated = await services.records.save({ commandId: "activate-1", expectedVersion: 1, record: active });
    if (updated.stored.recordVersion !== 2) throw new Error("Update version failed.");
    let stale = false;
    try {
      await services.records.save({ commandId: "stale-1", expectedVersion: 1, record: active });
    } catch (error: unknown) {
      if (!(error instanceof PersistenceConflictError)) throw error;
      stale = true;
    }
    if (!stale) throw new Error("Stale update accepted.");
    let reused = false;
    try {
      await services.records.save({ commandId: "activate-1", expectedVersion: 1, record: initial });
    } catch (error: unknown) {
      if (!(error instanceof CommandIdentityConflictError)) throw error;
      reused = true;
    }
    if (!reused) throw new Error("Command ID reuse accepted.");

    const races = await Promise.allSettled([
      services.records.save({ commandId: "writer-a", expectedVersion: 2, record: active }),
      services.records.save({ commandId: "writer-b", expectedVersion: 2, record: active }),
    ]);
    if (races.filter(result => result.status === "fulfilled").length !== 1 ||
        races.filter(result => result.status === "rejected" && result.reason instanceof PersistenceConflictError).length !== 1) {
      throw new Error("Concurrent stale writers must not both commit.");
    }

    lifecycle.transition("stopped");
    const stopped: ExecutionRecord = {
      ...active,
      lifecycle: lifecycle.snapshot(),
      outcome: {
        status: "stopped",
        reason: { code: "limit-reached", message: "Fixture iteration limit." },
        partial: {
          summary: "Inspected sessions.",
          evidenceRefs: ["fixture:source/code-r4"],
          artifactRefs: [],
          unresolved: ["Expiry not checked."],
        },
        pendingOperationRefs: [],
      },
    };
    await services.records.save({ commandId: "stop-1", expectedVersion: 3, record: stopped });
    const foreign = await harness.open({ scopeId: "other-scope", projectId: "fixture-project" });
    if (await foreign.records.load("fixture-run") !== null) throw new Error("Scope isolation failed.");
    await harness.close();
    const reopened = await harness.open(scope);
    await reopened.schema.initialize();
    const restored = await reopened.records.load("fixture-run");
    if (restored?.recordVersion !== 4 || restored.record.lifecycle.status !== "stopped" ||
        restored.record.outcome?.status !== "stopped" ||
        restored.record.outcome.partial.unresolved[0] !== "Expiry not checked.") {
      throw new Error("Restart must preserve stopped status and partial findings.");
    }
    const lateReplay = await reopened.records.save({ commandId: "create-1", expectedVersion: 0, record: initial });
    if (!lateReplay.replayed || lateReplay.stored.recordVersion !== 1 ||
        (await reopened.records.load("fixture-run"))?.recordVersion !== 4) {
      throw new Error("Replay corrupted current state.");
    }
  } finally {
    await harness.close();
  }
}
