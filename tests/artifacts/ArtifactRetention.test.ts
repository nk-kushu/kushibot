import type { IArtifactTestHarness } from "./IArtifactTestHarness.js";
import { artifactFixtureLimits } from "../fixtures/artifactFixtureLimits.js";
import { MutableArtifactClock } from "../fakes/MutableArtifactClock.js";
import { ArtifactError } from "../../src/errors/ArtifactError.js";

export async function verifyArtifactRetention(harness: IArtifactTestHarness): Promise<void> {
  const scope = { scopeId: "retention-test", projectId: "fixture-project" };
  const producer = { operationId: "retention-producer" };
  const clock = new MutableArtifactClock(1000);
  try {
    let services = await harness.open(scope, producer, artifactFixtureLimits, clock);
    await services.schema.initialize();
    const request = { name: "report.txt", kind: "report", mediaType: "text/plain", schemaId: null, schemaVersion: null,
      sourceRefs: ["fixture:source/r4"], idempotencyKey: "protected", expiresAtEpochMs: 1500,
      data: new TextEncoder().encode("first\nsecond\n") };
    const ref = await services.store.write(request);
    const page = await services.pages.readPage({ reference: ref, maxBytes: 64, maxLines: 1 });
    clock.advance(1100);
    let cursorExpired = false;
    try { await services.pages.readPage({ reference: ref, cursor: page.nextCursor ?? undefined, maxBytes: 64, maxLines: 1 }); }
    catch (error: unknown) { if (!(error instanceof ArtifactError) || error.code !== "ARTIFACT_CURSOR_INVALID") throw error; cursorExpired = true; }
    if (!cursorExpired) throw new Error("Cursor lifetime was extended silently.");
    await harness.close();
    services = await harness.open(scope, producer, artifactFixtureLimits, clock);
    if ((await services.store.write(request)).artifactId !== ref.artifactId) throw new Error("A producer pin did not protect restart recovery.");
    await services.retention.pin(ref.artifactId, "consumer:fixture-run");
    await services.retention.unpin(ref.artifactId, `producer:${producer.operationId}`);
    if (await services.retention.deleteExpired(ref.artifactId)) throw new Error("A pinned artifact was deleted.");
    await services.store.read(ref, 100);
    await services.retention.unpin(ref.artifactId, "consumer:fixture-run");
    let expired = false;
    try { await services.store.read(ref, 100); }
    catch (error: unknown) { if (!(error instanceof ArtifactError) || error.code !== "ARTIFACT_EXPIRED") throw error; expired = true; }
    if (!expired || !await services.retention.deleteExpired(ref.artifactId)) throw new Error("Expired unpinned retention failed.");
  } finally { await harness.close(); }
}
