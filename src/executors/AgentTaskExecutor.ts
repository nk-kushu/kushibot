import type { IExecutor } from "./contracts/IExecutor.js";
import type { IExecutionContext } from "./contracts/IExecutionContext.js";
import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";
import type { IPolicy } from "../contracts/IPolicy.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { TaskInput } from "./TaskInput.js";
import type { AgentTaskMode } from "./AgentTaskMode.js";
import type { AgentTaskAssignment } from "./AgentTaskAssignment.js";
import type { IAgentTaskFactory } from "./IAgentTaskFactory.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { ExecutorContractError } from "../errors/ExecutorContractError.js";
export class AgentTaskExecutor<TResult> implements IExecutor<TaskInput,TResult> {
  constructor(private readonly mode: AgentTaskMode,
    private readonly policy: IPolicy<TaskInput,AgentTaskAssignment>,
    private readonly factory: IAgentTaskFactory<TResult>,
    private readonly clock: IClock) { if (!["investigate","structured","edit"].includes(mode)) throw new ExecutorContractError(); }
  async execute(input: TaskInput, context: IExecutionContext): Promise<ExecutionOutcome<TResult>> {
    const guard = new ExecutionBoundaryGuard(this.clock,context.signal,context.deadlineEpochMs);
    const before = guard.check(); if (before !== null) return this.stopped(before);
    const assignment = await this.policy.apply(input);
    if (typeof assignment.instructions !== "string" ||
        !assignment.instructions.trim() ||
        assignment.instructions.length > 4096 ||
        Object.keys(assignment).length !== 1) throw new ExecutorContractError();
    const after = guard.check(); if (after !== null) return this.stopped(after);
    const binding = await this.factory.create(Object.freeze({ input, mode: this.mode, assignment: Object.freeze({instructions: assignment.instructions}) }),context);
    const child = binding.context;
    if (child.signal !== context.signal ||
        child.scope.scopeId !== context.scope.scopeId ||
        child.scope.projectId !== context.scope.projectId ||
        child.scope.workspaceId !== context.scope.workspaceId ||
        child.identity.runId !== context.identity.runId ||
        child.identity.stepRunId !== context.identity.stepRunId ||
        child.identity.parentOperationId !== context.identity.operationId ||
        typeof child.identity.sessionId !== "string" ||
        child.identity.sessionId === context.identity.sessionId ||
        child.identity.operationId === context.identity.operationId ||
        (context.deadlineEpochMs !== null && (child.deadlineEpochMs === null ||
        child.deadlineEpochMs > context.deadlineEpochMs))) throw new ExecutorContractError();
    const ready = guard.check(); if (ready !== null) return this.stopped(ready);
    return binding.unit.execute(undefined,binding.context);
  }
  private stopped(reason: import("../execution-control/ExecutionStopReason.js").ExecutionStopReason): ExecutionOutcome<TResult> { return { status: "stopped", reason, partial: { summary: "", evidenceRefs: [], artifactRefs: [], unresolved: ["Agent task did not start."] }, pendingOperationRefs: [] }; }
}
