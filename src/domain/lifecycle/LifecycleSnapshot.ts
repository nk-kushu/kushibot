import type { ExecutionKind } from "./ExecutionKind.js";
import type { LifecycleStatus } from "./LifecycleStatus.js";
import type { LifecycleEvidence } from "./LifecycleEvidence.js";

export type LifecycleSnapshot = Readonly<{
  schemaVersion: 1;
  kind: ExecutionKind;
  definitionVersion: string;
  executionId: string;
  status: LifecycleStatus;
  revision: number;
  cancellationRequested: boolean;
  pendingOperationRefs: readonly string[];
  evidence: LifecycleEvidence;
}>;
