import type { ArtifactRef } from "./ArtifactRef.js";

export type ArtifactSearchResult = Readonly<{
  reference: ArtifactRef;
  matches: readonly Readonly<{ line: number; startByte: number; endByteExclusive: number; content: string }>[];
  scannedBytes: number; done: boolean; nextCursor: string | null;
}>;
