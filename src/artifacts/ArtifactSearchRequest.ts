import type { ArtifactRef } from "./ArtifactRef.js";

export type ArtifactSearchRequest = Readonly<{
  reference: ArtifactRef; query: string; cursor?: string;
  maxMatches: number; maxBytes: number; maxScanBytes: number;
}>;
