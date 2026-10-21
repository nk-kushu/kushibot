import type { ArtifactLimits } from "../../src/artifacts/ArtifactLimits.js";

export const artifactFixtureLimits: ArtifactLimits = Object.freeze({
  maxArtifactBytes: 4096, maxArtifacts: 8, maxStoredBytes: 32768,
  chunkBytes: 32, maxPageBytes: 64, maxPageLines: 2, maxSearchScanBytes: 128,
  maxSearchMatches: 3, maxPinsPerArtifact: 8, maxCursors: 128, cursorTtlMs: 1000,
});
