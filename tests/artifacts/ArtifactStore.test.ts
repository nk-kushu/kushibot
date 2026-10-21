import type { IArtifactTestHarness } from "./IArtifactTestHarness.js";
import type { ArtifactWriteRequest } from "../../src/artifacts/ArtifactWriteRequest.js";
import { artifactFixtureLimits } from "../fixtures/artifactFixtureLimits.js";
import { MutableArtifactClock } from "../fakes/MutableArtifactClock.js";
import { ArtifactError } from "../../src/errors/ArtifactError.js";

export async function verifyArtifactStore(harness: IArtifactTestHarness): Promise<void> {
  const scope = { scopeId: "store-test", projectId: "fixture-project" };
  const producer = { operationId: "store-producer" };
  const clock = new MutableArtifactClock(1000);
  try {
    const services = await harness.open(scope, producer, artifactFixtureLimits, clock);
    await services.schema.initialize();
    await services.schema.initialize();
    const request: ArtifactWriteRequest = {
      name: "login-checks.txt", kind: "verification-report", mediaType: "text/plain",
      schemaId: null, schemaVersion: null, sourceRefs: ["fixture:source/code-r4"],
      idempotencyKey: "main-report", expiresAtEpochMs: 2000,
      data: new TextEncoder().encode("first café\ncallback failed\nlast line\n"),
    };
    let denied = false;
    try { await services.store.write({ ...request, idempotencyKey: "forbidden-html", mediaType: "text/html" }); }
    catch (error: unknown) { if (!(error instanceof ArtifactError) || error.code !== "ARTIFACT_DENIED") throw error; denied = true; }
    if (!denied) throw new Error("Capture policy rejection was ignored.");
    const ref = await services.store.write(request);
    const repeated = await services.store.write(request);
    if (ref.artifactId !== repeated.artifactId) throw new Error("Same producer/key must return the existing artifact.");
    let conflict = false;
    try { await services.store.write({ ...request, data: new TextEncoder().encode("different") }); }
    catch (error: unknown) { if (!(error instanceof ArtifactError) || error.code !== "ARTIFACT_CONFLICT") throw error; conflict = true; }
    if (!conflict) throw new Error("Conflicting content was accepted.");
    let limited = false;
    try { await services.store.read(ref, 5); }
    catch (error: unknown) { if (!(error instanceof ArtifactError) || error.code !== "ARTIFACT_LIMIT") throw error; limited = true; }
    if (!limited) throw new Error("A full read was silently truncated.");
    const read = await services.store.read(ref, 100);
    read.data.fill(0);
    if (new TextDecoder().decode((await services.store.read(ref, 100)).data) !== "first café\ncallback failed\nlast line\n") {
      throw new Error("Read bytes leaked mutable store state.");
    }
    const foreign = await harness.open({ scopeId: "foreign", projectId: "fixture-project" }, producer, artifactFixtureLimits, clock);
    let missing = false;
    try { await foreign.store.read(ref, 100); }
    catch (error: unknown) { if (!(error instanceof ArtifactError) || error.code !== "ARTIFACT_MISSING") throw error; missing = true; }
    if (!missing) throw new Error("Foreign artifact became readable.");
    const binary = await services.store.write({ ...request, idempotencyKey: "binary", mediaType: "application/octet-stream", data: new Uint8Array([0, 255, 1]) });
    if ((await services.store.read(binary, 100)).data[1] !== 255) throw new Error("Binary round trip failed.");
    let unsupported = false;
    try { await services.pages.readPage({ reference: binary, maxLines: 1, maxBytes: 64 }); }
    catch (error: unknown) { if (!(error instanceof ArtifactError) || error.code !== "ARTIFACT_UNSUPPORTED") throw error; unsupported = true; }
    if (!unsupported) throw new Error("Binary content was incorrectly treated as text.");
    await harness.close();
    const reopened = await harness.open(scope, producer, artifactFixtureLimits, clock);
    await reopened.schema.initialize();
    if ((await reopened.store.write(request)).artifactId !== ref.artifactId) throw new Error("Restart lost producer idempotency.");
    await harness.corruptChunk(scope, ref.artifactId);
    let corrupt = false;
    try { await reopened.store.read(ref, 100); }
    catch (error: unknown) { if (!(error instanceof ArtifactError) || error.code !== "ARTIFACT_CORRUPT") throw error; corrupt = true; }
    if (!corrupt) throw new Error("Corrupt stored content was accepted.");
  } finally { await harness.close(); }
}
