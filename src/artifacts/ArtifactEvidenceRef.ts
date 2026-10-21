import type { ArtifactRef } from "./ArtifactRef.js";

export type ArtifactEvidenceRef = Readonly<{
  artifact: ArtifactRef;
  sourceRefs: readonly string[];
  coverage: "full" | "excerpt";
  startByte: number; endByteExclusive: number;
}>;
