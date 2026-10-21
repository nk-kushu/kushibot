import type { ArtifactWriteRequest } from "./ArtifactWriteRequest.js";
import type { ArtifactRef } from "./ArtifactRef.js";

export interface IArtifactWriter {
  write(request: ArtifactWriteRequest, signal?: AbortSignal): Promise<ArtifactRef>;
}
