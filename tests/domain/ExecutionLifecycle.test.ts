import { ExecutionLifecycle } from "../../src/domain/lifecycle/ExecutionLifecycle.js";
import { workflowRunLifecycle } from "../../src/domain/lifecycle/workflowRunLifecycle.js";
import { stepRunLifecycle } from "../../src/domain/lifecycle/stepRunLifecycle.js";
import { agenticSessionLifecycle } from "../../src/domain/lifecycle/agenticSessionLifecycle.js";
import { InvalidLifecycleTransitionError } from "../../src/errors/InvalidLifecycleTransitionError.js";

export function verifyLifecycles(): void {
  for (const definition of [workflowRunLifecycle, stepRunLifecycle, agenticSessionLifecycle]) {
    const life = ExecutionLifecycle.create(definition, `fixture-${definition.kind}`);
    const before = life.snapshot();
    let rejected = false;
    try {
      life.transition("completed", { acceptedResultRef: "fixture:result/1" });
    } catch (error: unknown) {
      if (!(error instanceof InvalidLifecycleTransitionError)) throw error;
      rejected = true;
    }
    if (!rejected || life.snapshot() !== before) throw new Error("Invalid transition mutated state.");
    life.transition("active");
    life.recordPendingOperation("fixture:operation/write-1");
    life.requestCancellation();
    if (life.snapshot().status !== "stopping") throw new Error("Cancellation must first record intent.");
    rejected = false;
    try {
      life.transition("cancelled");
    } catch (error: unknown) {
      if (!(error instanceof InvalidLifecycleTransitionError)) throw error;
      rejected = true;
    }
    if (!rejected) throw new Error("Pending effects must block terminal cancellation.");
    life.recordReconciledOperation("fixture:operation/write-1");
    life.transition("cancelled");
    if (life.snapshot().revision !== 5 || !Object.isFrozen(life.snapshot().pendingOperationRefs)) {
      throw new Error("Lifecycle revisions and snapshot isolation must be preserved.");
    }
    rejected = false;
    try {
      life.transition("active");
    } catch (error: unknown) {
      if (!(error instanceof InvalidLifecycleTransitionError)) throw error;
      rejected = true;
    }
    if (!rejected) throw new Error("Terminal history must not be revived.");
  }
  const completed = ExecutionLifecycle.create(stepRunLifecycle, "step-completed");
  completed.transition("active");
  completed.transition("completed", { acceptedResultRef: "fixture:accepted-result/1" });
  if (completed.snapshot().status !== "completed") throw new Error("Valid completion failed.");
}
