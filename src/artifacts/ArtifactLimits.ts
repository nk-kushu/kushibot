export type ArtifactLimits = Readonly<{
  maxArtifactBytes: number; maxArtifacts: number; maxStoredBytes: number;
  chunkBytes: number; maxPageBytes: number; maxPageLines: number;
  maxSearchScanBytes: number; maxSearchMatches: number; maxPinsPerArtifact: number;
  maxCursors: number; cursorTtlMs: number;
}>;
