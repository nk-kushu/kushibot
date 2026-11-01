import type { ExecutionOutcome } from "../contracts/outcomes/ExecutionOutcome.js";

/**
 * The outcome a step returns to wait for something outside the process, usually a human.
 *
 * The attempt is recorded as stopped with `ref` still pending, so the engine interrupts the
 * run and returns `pending` instead of asking a model whether an answer has arrived. Declare
 * a transition from the step to itself: after `Agent.resume` it reopens the step, whose
 * executor then reads the answer from wherever the application saved it.
 */
export class WorkflowWait {
  private static readonly refPattern = /^wait:[A-Za-z0-9_.:-]{1,123}$/;

  static outcome(ref: string, message: string): ExecutionOutcome<never> {
    if (!WorkflowWait.refPattern.test(ref)) throw new Error("Invalid wait reference.");
    return {
      status: "stopped",
      reason: { code: "no-progress", message },
      partial: { summary: message, evidenceRefs: [], artifactRefs: [], unresolved: [message] },
      pendingOperationRefs: [ref],
    };
  }
}
