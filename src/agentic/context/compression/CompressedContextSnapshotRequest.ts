import type { ContextCompositionInput } from "../ContextCompositionInput.js";
import type { ArtifactRef } from "../../../artifacts/ArtifactRef.js";
export type CompressedContextSnapshotRequest = Readonly<{ parentSnapshotRef: string; summaryArtifact: ArtifactRef; candidate: Omit<ContextCompositionInput, "snapshotRef"> }>;
