import type { ArtifactMetadata } from "./ArtifactMetadata.js";

export type ArtifactDocument = Readonly<{ metadata: ArtifactMetadata; data: Uint8Array }>;
