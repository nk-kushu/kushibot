import type { ArtifactRef } from "./ArtifactRef.js";
import type { ArtifactDocument } from "./ArtifactDocument.js";

export interface IArtifactReader {
  read(reference: ArtifactRef, maxBytes: number, signal?: AbortSignal): Promise<ArtifactDocument>;
}
