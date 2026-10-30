import type { IArtifactWriter } from "../artifacts/IArtifactWriter.js";
import type { ArtifactWriteRequest } from "../artifacts/ArtifactWriteRequest.js";
import type { ArtifactRef } from "../artifacts/ArtifactRef.js";
import type { IScopedDebugRecorder } from "../events/debug/IScopedDebugRecorder.js";

/** Traces each artifact write: its kind, size, digest and the id the store assigned. Data is not recorded. */
export class DebugRecordingArtifactWriter implements IArtifactWriter {
  constructor(private readonly artifacts: IArtifactWriter, private readonly debug: IScopedDebugRecorder) {}
  write(request: ArtifactWriteRequest, signal?: AbortSignal): Promise<ArtifactRef> {
    return this.debug.operation("artifact.write", async () => {
      const ref = await this.artifacts.write(request, signal);
      this.debug.event("result.persisted", "info", {
        operation: "artifact.stored",
        nextState: "stored",
        relatedRefs: [
          `artifact:${ref.artifactId}`,
          `kind:${request.kind}`,
          `name:${request.name}`,
          `media:${ref.mediaType}`,
          `digest:${ref.digest.slice(0, 16)}`,
          ...(ref.schemaId ? [`schema:${ref.schemaId}@${ref.schemaVersion ?? "?"}`] : []),
          ...request.sourceRefs.slice(0, 8).map(source => `source:${source}`),
        ].map(item => item.slice(0, 256)),
        metrics: { bytes: ref.byteLength, sourceRefs: request.sourceRefs.length },
      });
      return ref;
    }, {
      relatedRefs: [`kind:${request.kind}`, `name:${request.name}`].map(item => item.slice(0, 256)),
      metrics: { bytes: request.data.byteLength },
    });
  }
}
