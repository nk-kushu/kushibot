import type { IExecutionContext } from "../../src/executors/contracts/IExecutionContext.js";
import type { ExecutionOutcome } from "../../src/contracts/outcomes/ExecutionOutcome.js";
import type { PartialProgress } from "../../src/contracts/outcomes/PartialProgress.js";
import { FakeExecutor } from "../fakes/FakeExecutor.js";
import { RecordingExecutionReporter } from "../fakes/RecordingExecutionReporter.js";

export async function verifyExecutorOutcomes(): Promise<void> {
  const context: IExecutionContext = {
    identity: { operationId: "op-1", runId: "run-1", stepRunId: "step-1" },
    scope: { scopeId: "scope-1", projectId: "fixture-project" },
    signal: new AbortController().signal,
    deadlineEpochMs: null,
    reporter: new RecordingExecutionReporter(),
  };
  const partial: PartialProgress = {
    summary: "Inspected session creation.",
    evidenceRefs: ["fixture:source/code-r4/session-service"],
    artifactRefs: [],
    unresolved: ["Session expiry not inspected."],
  };
  const outcomes: readonly ExecutionOutcome<string>[] = [
    { status: "completed", result: "Investigation report." },
    {
      status: "stopped",
      reason: { code: "limit-reached", message: "Iteration limit reached." },
      partial,
      pendingOperationRefs: [],
    },
    {
      status: "failed",
      error: { code: "FIXTURE_FAILURE", message: "Fixture operation failed." },
      partial,
      pendingOperationRefs: ["fixture:operation/uncertain-1"],
    },
  ];
  for (const outcome of outcomes) {
    const executor = new FakeExecutor<string, string>(outcome);
    const returned = await executor.execute("Investigate sessions.", context);
    const call = executor.snapshot()[0];
    if (returned !== outcome || call.input !== "Investigate sessions." || call.context !== context) {
      throw new Error("Executor must receive the input/context and return its configured envelope.");
    }
    if (returned.status !== "completed" && returned.partial.unresolved.length !== 1) {
      throw new Error("Unsuccessful outcomes must retain unresolved work.");
    }
  }
}
