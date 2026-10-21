import { LifecycleDefinition } from "./LifecycleDefinition.js";
import { LifecycleSnapshotContract } from "./LifecycleSnapshotContract.js";
import type { LifecycleSnapshot } from "./LifecycleSnapshot.js";
import type { LifecycleStatus } from "./LifecycleStatus.js";
import type { LifecycleEvidence } from "./LifecycleEvidence.js";
import { InvalidLifecycleTransitionError } from "../../errors/InvalidLifecycleTransitionError.js";
import { InvalidLifecycleSnapshotError } from "../../errors/InvalidLifecycleSnapshotError.js";

export class ExecutionLifecycle {
  private constructor(
    private readonly definition: LifecycleDefinition,
    private state: LifecycleSnapshot,
  ) {}

  static create(definition: LifecycleDefinition, executionId: string): ExecutionLifecycle {
    if (typeof executionId !== "string" || !executionId.trim()) {
      throw new InvalidLifecycleSnapshotError("Expected an execution identifier.");
    }
    return new ExecutionLifecycle(definition, Object.freeze({
      schemaVersion: 1, kind: definition.kind, definitionVersion: definition.version,
      executionId, status: definition.initial, revision: 0, cancellationRequested: false,
      pendingOperationRefs: Object.freeze([]), evidence: Object.freeze({}),
    }));
  }

  static async restore(definition: LifecycleDefinition, data: unknown): Promise<ExecutionLifecycle> {
    const checked = await new LifecycleSnapshotContract(definition).validate(data);
    if (!checked.valid) throw new InvalidLifecycleSnapshotError("Snapshot restoration rejected.");
    return new ExecutionLifecycle(definition, checked.value);
  }

  snapshot(): LifecycleSnapshot { return this.state; }

  transition(to: LifecycleStatus, evidence: LifecycleEvidence = {}): void {
    this.move(to, evidence, this.state.cancellationRequested);
  }

  requestCancellation(): void {
    if (this.state.cancellationRequested) return;
    this.move("stopping", {}, true);
  }

  recordPendingOperation(reference: string): void {
    if (this.state.status !== "active" || this.state.cancellationRequested || !this.reference(reference)) {
      throw new InvalidLifecycleTransitionError("Cannot admit pending work in this state.");
    }
    if (this.state.pendingOperationRefs.includes(reference)) return;
    this.commit({ ...this.state, pendingOperationRefs: Object.freeze([...this.state.pendingOperationRefs, reference]) });
  }

  retainPendingOperation(reference:string):void{
    if(!["active","stopping","interrupted","recovering"].includes(this.state.status)||!this.reference(reference))throw new InvalidLifecycleTransitionError("Cannot retain pending evidence in this state.");
    if(!this.state.pendingOperationRefs.includes(reference))this.commit({...this.state,pendingOperationRefs:Object.freeze([...this.state.pendingOperationRefs,reference])});
  }
  attachCheckpoint(reference:string):void{if(!this.reference(reference))throw new InvalidLifecycleTransitionError("Invalid checkpoint reference.");this.commit({...this.state,evidence:Object.freeze({...this.state.evidence,checkpointRef:reference})});}
  recordReconciledOperation(reference: string): void {
    if (!this.state.pendingOperationRefs.includes(reference)) {
      throw new InvalidLifecycleTransitionError("Unknown pending operation.");
    }
    // Only the owning coordinator may call this after establishing actual effects/usage.
    this.commit({ ...this.state, pendingOperationRefs: Object.freeze(
      this.state.pendingOperationRefs.filter(ref => ref !== reference),
    ) });
  }

  private move(to: LifecycleStatus, evidence: LifecycleEvidence, cancellationRequested: boolean): void {
    if (!this.definition.allows(this.state.status, to)) {
      throw new InvalidLifecycleTransitionError("Transition is not allowed by this lifecycle.");
    }
    if (Object.keys(evidence).some(key => !["acceptedResultRef", "checkpointRef", "proposalRef"].includes(key)) ||
        Object.values(evidence).some(value => !this.reference(value))) {
      throw new InvalidLifecycleTransitionError("Invalid evidence reference.");
    }
    const merged = Object.freeze({ ...this.state.evidence, ...evidence });
    if ((this.definition.isTerminal(to) && this.state.pendingOperationRefs.length > 0) ||
        (["completed", "paused", "waiting-for-approval", "retry-wait"].includes(to) && this.state.pendingOperationRefs.length > 0) ||
        (to === "active" && this.state.status === "recovering" && this.state.pendingOperationRefs.length > 0) ||
        (to === "completed" && !merged.acceptedResultRef) ||
        (to === "paused" && !merged.checkpointRef) ||
        (to === "waiting-for-approval" && !merged.proposalRef) ||
        (to === "cancelled" && !cancellationRequested) ||
        (cancellationRequested && !["stopping", "recovering", "cancelled", "failed"].includes(to))) {
      throw new InvalidLifecycleTransitionError("Required lifecycle evidence or reconciliation is missing.");
    }
    this.commit({ ...this.state, status: to, evidence: merged, cancellationRequested });
  }

  private commit(next: LifecycleSnapshot): void {
    if (!Number.isSafeInteger(this.state.revision + 1)) {
      throw new InvalidLifecycleTransitionError("Lifecycle revision exhausted.");
    }
    this.state = Object.freeze({ ...next, revision: this.state.revision + 1 });
  }

  private reference(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }
}
