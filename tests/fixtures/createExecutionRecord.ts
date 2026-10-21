import type { ExecutionRecord } from "../../src/contracts/persistence/ExecutionRecord.js";
import type { ExecutionScopeRef } from "../../src/contracts/runtime/ExecutionScopeRef.js";
import { ExecutionLifecycle } from "../../src/domain/lifecycle/ExecutionLifecycle.js";
import { workflowRunLifecycle } from "../../src/domain/lifecycle/workflowRunLifecycle.js";

export function createExecutionRecord(scope: ExecutionScopeRef, executionId: string): ExecutionRecord {
  return {
    schemaVersion: 1,
    scope,
    identity: { operationId: `${executionId}-operation`, runId: executionId },
    lifecycle: ExecutionLifecycle.create(workflowRunLifecycle, executionId).snapshot(),
    definition: { id: "fixture-workflow", version: "1" },
    configuration: {
      logEnabled: false,
      logLevel: "info",
      maxIterations: 6,
      maxSubAgents: 2,
      maxSubAgentDepth: 1,
    },
    registrations: [],
    sourceRefs: ["fixture:source/code-r4"],
    checkpointRef: null,
    outcome: null,
  };
}
