export interface IArtifactDigest {
  hash(bytes: Uint8Array): Promise<string>;
}
