import type { ExecutionScopeRef } from "../../../contracts/runtime/ExecutionScopeRef.js";
import type { SummaryPoint } from "./SummaryPoint.js";
export type ContextSummaryRecord = Readonly<{ schemaVersion: 1; summaryId: string; sourceSnapshotRef: string; scope: ExecutionScopeRef;
  acceptanceId: string; acceptanceVersion: string; generatorId: string; generatorVersion: string; sources: readonly Readonly<{ id: string; sourceRef: string; revisionRef: string }>[];
  points: readonly SummaryPoint[]; unresolved: readonly string[]; pendingOperationRefs: readonly string[] }>;
