import type { ArtifactPageRequest } from "./ArtifactPageRequest.js";
import type { ArtifactPage } from "./ArtifactPage.js";

export interface IArtifactPagedReader {
  readPage(request: ArtifactPageRequest, signal?: AbortSignal): Promise<ArtifactPage>;
}
