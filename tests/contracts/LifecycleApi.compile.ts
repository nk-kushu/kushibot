import type {
  ExecutionKind,
  LifecycleStatus,
  LifecycleRules,
  LifecycleEvidence,
  LifecycleSnapshot,
} from "../../src/index.js";
import {
  ExecutionIdentityContract,
  ExecutionIdentityFactory,
  ExecutionLifecycle,
  LifecycleDefinition,
  LifecycleSnapshotContract,
  workflowRunLifecycle,
  stepRunLifecycle,
  agenticSessionLifecycle,
  InvalidExecutionIdentityError,
  InvalidLifecycleTransitionError,
  InvalidLifecycleSnapshotError,
} from "../../src/index.js";

export type LifecycleApiFixture = Readonly<{
  kind: ExecutionKind;
  status: LifecycleStatus;
  rules: LifecycleRules;
  evidence: LifecycleEvidence;
  snapshot: LifecycleSnapshot;
  identityContract: typeof ExecutionIdentityContract;
  identityFactory: typeof ExecutionIdentityFactory;
  lifecycle: typeof ExecutionLifecycle;
  definition: typeof LifecycleDefinition;
  snapshotContract: typeof LifecycleSnapshotContract;
  workflow: typeof workflowRunLifecycle;
  step: typeof stepRunLifecycle;
  session: typeof agenticSessionLifecycle;
  identityError: typeof InvalidExecutionIdentityError;
  transitionError: typeof InvalidLifecycleTransitionError;
  snapshotError: typeof InvalidLifecycleSnapshotError;
}>;
