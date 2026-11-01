import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { IWorkflowRunStore } from "./IWorkflowRunStore.js";
import { WorkflowRunError } from "../errors/WorkflowRunError.js";

/**
 * Hands a run interrupted on known waits to a new engine.
 *
 * A wait needs no reconciliation against an unknown effect, so this is the fenced part of
 * `WorkflowRecoveryCoordinator` without its attempt, usage and effect sources: it takes over
 * from the previous owner, records each wait as resolved and returns the run to active.
 */
export class WorkflowRunResumption {
  constructor(
    private readonly runs: IWorkflowRunStore,
    private readonly ids: IIdGenerator,
  ) {}

  async reopen(resolvedRefs: readonly string[]): Promise<void> {
    const run = await this.runs.read();
    const pending = run.lifecycle.pendingOperationRefs;
    if (
      run.outcome !== null ||
      run.lifecycle.status !== "interrupted" ||
      run.lifecycle.cancellationRequested ||
      run.transitionPlan !== null ||
      run.attempts.some((attempt) => attempt.receipt === null) ||
      pending.length === 0 ||
      [...pending].sort().join("\n") !== [...new Set(resolvedRefs)].sort().join("\n")
    )
      throw new WorkflowRunError();
    const owner = this.ids.nextId();
    await this.runs.mutate((state) =>
      state.fenceRecovery(
        run.revision,
        run.engineOwner?.ownerToken ?? null,
        owner,
        `wait-resolved:${run.runId}`,
      ),
    );
    for (const ref of pending)
      await this.runs.mutate((state) => state.acknowledgeEffect(owner, ref, `${ref}:resolved`));
    await this.runs.mutate((state) => state.finishRecovery(owner, this.ids.nextId(), true, null));
  }
}
