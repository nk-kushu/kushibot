import type { IArtifactDigest } from "./IArtifactDigest.js";

export class Sha256ArtifactDigest implements IArtifactDigest {
  constructor(private readonly subtle: SubtleCrypto) {}

  async hash(bytes: Uint8Array): Promise<string> {
    const digest = await this.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
    return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
  }
}
