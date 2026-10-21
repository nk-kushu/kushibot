import type { ArtifactRef } from "./ArtifactRef.js";

export type ArtifactPageRequest = Readonly<{
  reference: ArtifactRef; cursor?: string; maxLines: number; maxBytes: number;
}>;
