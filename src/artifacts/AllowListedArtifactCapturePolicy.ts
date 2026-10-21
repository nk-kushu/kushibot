import type { IPolicy } from "../contracts/IPolicy.js";
import type { ArtifactWriteRequest } from "./ArtifactWriteRequest.js";
import type { ArtifactCaptureDecision } from "./ArtifactCaptureDecision.js";

export class AllowListedArtifactCapturePolicy implements IPolicy<ArtifactWriteRequest, ArtifactCaptureDecision> {
  private readonly allowed: ReadonlySet<string>;
  constructor(mediaTypes: readonly string[]) { this.allowed = new Set(mediaTypes); }
  async apply(input: ArtifactWriteRequest): Promise<ArtifactCaptureDecision> {
    return this.allowed.has(input.mediaType)
      ? { allowed: true }
      : { allowed: false, reason: "Media type is not permitted for capture." };
  }
}
