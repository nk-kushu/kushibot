export type ArtifactWriteRequest = Readonly<{
  name: string; kind: string; mediaType: string;
  schemaId: string | null; schemaVersion: string | null;
  sourceRefs: readonly string[];
  idempotencyKey: string;
  expiresAtEpochMs: number | null;
  data: Uint8Array;
}>;
