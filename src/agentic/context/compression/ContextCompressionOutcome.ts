import type { CompressionMeasurement } from "./CompressionMeasurement.js";
import type { ContextCompositionInput } from "../ContextCompositionInput.js";
import type { ContextSummaryRecord } from "./ContextSummaryRecord.js";
import type { ContextFragment } from "../ContextFragment.js";
import type { ArtifactRef } from "../../../artifacts/ArtifactRef.js";
import type { ExecutionStopReason } from "../../../execution-control/ExecutionStopReason.js";
export type ContextCompressionOutcome =
  | Readonly<{ status: "prepared"; measurement: CompressionMeasurement; original: ContextCompositionInput; summary: ContextSummaryRecord; artifact: ArtifactRef; fragment: ContextFragment; replacedIds: readonly string[] }>
  | Readonly<{ status: "unchanged"; original: ContextCompositionInput; code: string; savedArtifact?: ArtifactRef }>
  | Readonly<{ status: "stopped"; original: ContextCompositionInput; reason: ExecutionStopReason; savedArtifact?: ArtifactRef }>
  | Readonly<{ status: "uncertain"; original: ContextCompositionInput; pendingOperationRefs: readonly string[] }>;
