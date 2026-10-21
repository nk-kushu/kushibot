import type { ArtifactMetadata } from "./ArtifactMetadata.js";

export type ArtifactAvailability = Readonly<{ metadata: ArtifactMetadata; pinCount: number }>;
