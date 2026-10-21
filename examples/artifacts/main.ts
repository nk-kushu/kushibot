import type { ISqlDatabase, IClock, ArtifactLimits } from "../../src/index.js";
import {
  SqliteArtifactStoreFactory, Sha256ArtifactDigest, CryptoArtifactIdGenerator, AllowListedArtifactCapturePolicy,
} from "../../src/index.js";

export async function runArtifactExample(database: ISqlDatabase, crypto: Crypto, clock: IClock): Promise<void> {
  // Teaching values, not production defaults.
  const limits: ArtifactLimits = {
    maxArtifactBytes: 4096, maxArtifacts: 8, maxStoredBytes: 32768, chunkBytes: 32,
    maxPageBytes: 64, maxPageLines: 2, maxSearchScanBytes: 128, maxSearchMatches: 3,
    maxPinsPerArtifact: 8, maxCursors: 128, cursorTtlMs: 1000,
  };
  const services = new SqliteArtifactStoreFactory({
    database, scope: { scopeId: "artifact-example", projectId: "fixture-project" }, limits,
    digest: new Sha256ArtifactDigest(crypto.subtle), clock, ids: new CryptoArtifactIdGenerator(crypto),
    capture: new AllowListedArtifactCapturePolicy(["text/plain"]), metadataMaxBytes: 65536,
  }).create({ operationId: "artifact-example-producer" });
  await services.schema.initialize();
  const ref = await services.store.write({
    name: "google-login-checks.txt", kind: "verification-report", mediaType: "text/plain", schemaId: null, schemaVersion: null,
    sourceRefs: ["fixture:source/code-r4"], idempotencyKey: "main-report", expiresAtEpochMs: null,
    data: new TextEncoder().encode("password login: passed\ncallback expiry: failed\n"),
  });
  const document = await services.store.read(ref, 100);
  const page = await services.pages.readPage({ reference: ref, maxLines: 1, maxBytes: 64 });
  const search = await services.search.search({ reference: ref, query: "callback", maxMatches: 1, maxBytes: 64, maxScanBytes: 128 });
  console.log({ ref, report: new TextDecoder().decode(document.data), page, search });
  // The producer pin remains until a real durable parent record or cleanup policy takes ownership.
}
