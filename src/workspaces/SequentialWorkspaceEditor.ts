import type { IWorkspaceFiles } from "./IWorkspaceFiles.js";
import type { IWorkspaceEditGate } from "./IWorkspaceEditGate.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { WorkspaceHandle } from "./WorkspaceHandle.js";
import type { WorkspaceEditingOutcome } from "./WorkspaceEditingOutcome.js";
import { WorkspaceEditSession } from "./WorkspaceEditSession.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { WorkspaceOperationError } from "../errors/WorkspaceOperationError.js";
export class SequentialWorkspaceEditor {
  constructor(private readonly files: IWorkspaceFiles, private readonly gate: IWorkspaceEditGate,
    private readonly handle: WorkspaceHandle, private readonly clock: IClock, private readonly ids: IIdGenerator) {}
  async edit<TValue>(context: IExecutionContext, work: (session: WorkspaceEditSession) => Promise<TValue>): Promise<WorkspaceEditingOutcome<TValue>> {
    if (context.scope.scopeId !== this.handle.scope.scopeId || context.scope.projectId !== this.handle.scope.projectId || context.scope.workspaceId !== this.handle.workspaceId) throw new WorkspaceOperationError();
    const controls = new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs);
    const before = controls.check(); if (before !== null) return { kind: "stopped", reason: before };
    const owner = this.ids.nextId();
    if (!await this.gate.acquire(owner)) return { kind: "busy" };
    const session = new WorkspaceEditSession(this.files, owner, controls);
    try {
      const admitted = controls.check(); if (admitted !== null) return { kind: "stopped", reason: admitted };
      return { kind: "completed", value: await work(session) };
    } finally {
      // Never race the actual callback against a timer here. The caller can stop waiting, but this owner must drain first.
      await session.closeAndDrain();
      await this.gate.release(owner);
    }
  }
}
