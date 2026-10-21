import type { ArtifactLimits } from "./ArtifactLimits.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";

export function validateArtifactLimits(limits: ArtifactLimits): ArtifactLimits {
  const fields: readonly (keyof ArtifactLimits)[] = ["maxArtifactBytes", "maxArtifacts", "maxStoredBytes",
    "chunkBytes", "maxPageBytes", "maxPageLines", "maxSearchScanBytes", "maxSearchMatches",
    "maxPinsPerArtifact", "maxCursors", "cursorTtlMs"];
  if (fields.some(key => !Number.isSafeInteger(limits[key]) || limits[key] < 1) ||
      limits.chunkBytes > limits.maxArtifactBytes || limits.maxPageBytes > limits.maxArtifactBytes ||
      limits.maxSearchScanBytes > limits.maxArtifactBytes || limits.maxStoredBytes < limits.maxArtifactBytes) {
    throw new ConfigurationError("Invalid artifact limits.");
  }
  return Object.freeze({ ...limits });
}
