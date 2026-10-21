export type ArtifactRef = Readonly<{
  artifactId: string;
  digest: string;
  byteLength: number;
  mediaType: string;
  schemaId: string | null;
  schemaVersion: string | null;
}>;
