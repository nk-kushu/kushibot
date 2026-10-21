import type { ArtifactRef } from "./ArtifactRef.js";

export type ArtifactPage = Readonly<{
  reference: ArtifactRef; content: string;
  range: Readonly<{ firstLine: number | null; lastLine: number | null; startByte: number; endByteExclusive: number }>;
  scannedBytes: number; done: boolean; nextCursor: string | null;
}>;
