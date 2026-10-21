import type { ArtifactSearchRequest } from "./ArtifactSearchRequest.js";
import type { ArtifactSearchResult } from "./ArtifactSearchResult.js";

export interface IArtifactSearchReader {
  search(request: ArtifactSearchRequest, signal?: AbortSignal): Promise<ArtifactSearchResult>;
}
