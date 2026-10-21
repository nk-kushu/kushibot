import type { ArtifactRef } from "./ArtifactRef.js";
import type { ArtifactMetadata } from "./ArtifactMetadata.js";
import type { ArtifactSlice } from "./ArtifactSlice.js";

export interface IArtifactRangeReader {
  info(reference: ArtifactRef, signal?: AbortSignal): Promise<ArtifactMetadata>;
  readSlice(reference: ArtifactRef, offset: number, length: number, maxScannedBytes: number, signal?: AbortSignal): Promise<ArtifactSlice>;
}
