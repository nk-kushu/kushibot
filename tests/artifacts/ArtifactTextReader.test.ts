import type { IArtifactTestHarness } from "./IArtifactTestHarness.js";
import { artifactFixtureLimits } from "../fixtures/artifactFixtureLimits.js";
import { MutableArtifactClock } from "../fakes/MutableArtifactClock.js";
import { ArtifactError } from "../../src/errors/ArtifactError.js";

export async function verifyArtifactTextReader(harness: IArtifactTestHarness): Promise<void> {
  try {
    const services = await harness.open({ scopeId: "text-test", projectId: "fixture-project" },
      { operationId: "text-producer" }, artifactFixtureLimits, new MutableArtifactClock(1000));
    await services.schema.initialize();
    const request = { name: "checks.txt", kind: "verification-report", mediaType: "text/plain",
      schemaId: null, schemaVersion: null, sourceRefs: ["fixture:source/code-r4"],
      idempotencyKey: "text", expiresAtEpochMs: null, data: new TextEncoder().encode("first café\ncallback failed\nlast line\n") };
    const ref = await services.store.write(request);
    const first = await services.pages.readPage({ reference: ref, maxLines: 1, maxBytes: 64 });
    if (first.done || first.nextCursor === null || first.content !== "first café\n") throw new Error("First page coverage is wrong.");
    const second = await services.pages.readPage({ reference: ref, cursor: first.nextCursor, maxLines: 1, maxBytes: 64 });
    if (second.content !== "callback failed\n" || second.range.firstLine !== 2 || second.nextCursor === null) throw new Error("Continuation skipped or repeated a line.");
    const third = await services.pages.readPage({ reference: ref, cursor: second.nextCursor, maxLines: 1, maxBytes: 64 });
    if (!third.done || third.content !== "last line\n" || third.nextCursor !== null) throw new Error("End-of-artifact coverage is wrong.");
    const found = await services.search.search({ reference: ref, query: "callback", maxMatches: 1, maxBytes: 64, maxScanBytes: 128 });
    if (found.matches[0]?.line !== 2 || found.done || found.nextCursor === null) throw new Error("Partial search coverage was lost.");
    const rest = await services.search.search({ reference: ref, query: "callback", cursor: found.nextCursor, maxMatches: 1, maxBytes: 64, maxScanBytes: 128 });
    if (!rest.done || rest.matches.length !== 0) throw new Error("Search continuation failed.");
    let cursorRejected = false;
    try { await services.search.search({ reference: ref, query: "another query", cursor: found.nextCursor, maxMatches: 1, maxBytes: 64, maxScanBytes: 128 }); }
    catch (error: unknown) { if (!(error instanceof ArtifactError) || error.code !== "ARTIFACT_CURSOR_INVALID") throw error; cursorRejected = true; }
    if (!cursorRejected) throw new Error("A cursor changed its query binding.");
    const long = await services.store.write({ ...request, idempotencyKey: "long-line", data: new TextEncoder().encode("x".repeat(80)) });
    let oversized = false;
    try { await services.pages.readPage({ reference: long, maxLines: 1, maxBytes: 64 }); }
    catch (error: unknown) { if (!(error instanceof ArtifactError) || error.code !== "ARTIFACT_LIMIT") throw error; oversized = true; }
    if (!oversized) throw new Error("Oversized line must not produce an empty nonadvancing page.");
    const cancelled = new AbortController(); cancelled.abort();
    let stopped = false;
    try { await services.store.read(ref, 100, cancelled.signal); }
    catch (error: unknown) { if (!(error instanceof ArtifactError) || error.code !== "ARTIFACT_CANCELLED") throw error; stopped = true; }
    if (!stopped) throw new Error("Cancelled read proceeded.");
  } finally { await harness.close(); }
}
