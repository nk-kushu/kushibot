import type { ArtifactMetadata } from "./ArtifactMetadata.js";
import type { ArtifactAvailability } from "./ArtifactAvailability.js";
import type { ArtifactLimits } from "./ArtifactLimits.js";

export interface IArtifactStorageAdapter {
  putOnce(metadata: ArtifactMetadata, encodedChunks: readonly string[], limits: ArtifactLimits): Promise<ArtifactMetadata>;
  findOperation(operationId: string, idempotencyKey: string): Promise<ArtifactMetadata | null>;
  load(artifactId: string): Promise<ArtifactAvailability | null>;
  readChunk(artifactId: string, index: number): Promise<string | null>;
  pin(artifactId: string, pinId: string, nowEpochMs: number, maxPins: number): Promise<void>;
  unpin(artifactId: string, pinId: string): Promise<void>;
  deleteExpired(artifactId: string, nowEpochMs: number): Promise<boolean>;
}
