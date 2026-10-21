import type { ModelProfile } from "../ModelProfile.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import type { PartialProgress } from "../../contracts/outcomes/PartialProgress.js";
export type ModelHandoff = Readonly<{
  schemaVersion: 1; handoffId: string; createdAtEpochMs: number; scope: ExecutionScopeRef;
  sourceSessionId: string; targetSessionId: string; sourceProfile: ModelProfile; targetProfile: ModelProfile;
  sourceRevision: string; assignment: string; partial: PartialProgress; pendingOperationRefs: readonly string[];
  budgetScopeId: string; deadlineEpochMs: number | null; permissionScopeRef: string;
}>;
