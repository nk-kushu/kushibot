import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { ArtifactRef } from "../../artifacts/ArtifactRef.js";
import type { WorkflowEngineOutcome } from "../../workflows/WorkflowEngineOutcome.js";
import type { WorkflowRecoveryOutcome } from "../../workflows/recovery/WorkflowRecoveryOutcome.js";
import { WorkflowEngine } from "../../workflows/WorkflowEngine.js";
import { WorkflowRecoveryCoordinator } from "../../workflows/recovery/WorkflowRecoveryCoordinator.js";

export async function recoverLoginWorkflowExample(
  recovery: WorkflowRecoveryCoordinator,
  engine: WorkflowEngine,
  administrativeContext: IExecutionContext,
  taskContext: IExecutionContext,
  checkpoint?: ArtifactRef,
): Promise<WorkflowRecoveryOutcome | WorkflowEngineOutcome> {
  const recovered = await recovery.recover(administrativeContext, checkpoint);
  if (recovered.status === "blocked") return recovered;
  // A stopped recovery is terminal; run() presents its retained partial outcome.
  // A resumed recovery continues through the same engine and original controls.
  return engine.run(taskContext);
}
