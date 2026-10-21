import { ExecutionLifecycle } from "../../src/domain/lifecycle/ExecutionLifecycle.js";
import { workflowRunLifecycle } from "../../src/domain/lifecycle/workflowRunLifecycle.js";
import { stepRunLifecycle } from "../../src/domain/lifecycle/stepRunLifecycle.js";
import { InvalidLifecycleSnapshotError } from "../../src/errors/InvalidLifecycleSnapshotError.js";

export async function verifyRestoration(): Promise<void> {
  const life = ExecutionLifecycle.create(workflowRunLifecycle, "run-restore");
  life.transition("active");
  life.recordPendingOperation("fixture:operation/unknown-write");
  life.transition("interrupted");
  const saved = JSON.parse(JSON.stringify(life.snapshot())) as unknown;
  const restored = await ExecutionLifecycle.restore(workflowRunLifecycle, saved);
  if (JSON.stringify(restored.snapshot()) !== JSON.stringify(saved)) {
    throw new Error("Restoration must preserve status, references, and revision.");
  }
  restored.transition("recovering");
  restored.recordReconciledOperation("fixture:operation/unknown-write");
  restored.transition("active");
  const invalidSnapshots: readonly unknown[] = [
    { ...(saved as object), schemaVersion: 2 },
    { ...(saved as object), definitionVersion: "unknown" },
    { ...(saved as object), revision: -1 },
    { ...(saved as object), status: "completed" },
    { ...(saved as object), status: "paused", evidence: { checkpointRef: "fixture:checkpoint/1" } },
    { ...(saved as object), status: "created" },
    { ...(saved as object), cancellationRequested: true },
    { ...(saved as object), pendingOperationRefs: ["duplicate", "duplicate"] },
  ];
  for (const invalid of invalidSnapshots) {
    let rejected = false;
    try {
      await ExecutionLifecycle.restore(workflowRunLifecycle, invalid);
    } catch (error: unknown) {
      if (!(error instanceof InvalidLifecycleSnapshotError)) throw error;
      rejected = true;
    }
    if (!rejected) throw new Error("Inconsistent restoration must be rejected.");
  }
  let incompatible = false;
  try {
    await ExecutionLifecycle.restore(stepRunLifecycle, saved);
  } catch (error: unknown) {
    if (!(error instanceof InvalidLifecycleSnapshotError)) throw error;
    incompatible = true;
  }
  if (!incompatible) throw new Error("Snapshot owner kind must match.");
}
