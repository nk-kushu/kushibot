import type { ArtifactErrorCode } from "./ArtifactErrorCode.js";

export class ArtifactError extends Error {
  constructor(readonly code: ArtifactErrorCode, message: string) {
    super(message);
    this.name = "ArtifactError";
  }
}
