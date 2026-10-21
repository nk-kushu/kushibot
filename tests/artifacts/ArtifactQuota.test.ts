import type { IArtifactTestHarness } from "./IArtifactTestHarness.js";
import { artifactFixtureLimits } from "../fixtures/artifactFixtureLimits.js";
import { MutableArtifactClock } from "../fakes/MutableArtifactClock.js";
import { ArtifactError } from "../../src/errors/ArtifactError.js";

export async function verifyArtifactQuota(harness: IArtifactTestHarness): Promise<void> {
  try {
    const services = await harness.open({ scopeId: "quota-test", projectId: "fixture-project" }, { operationId: "quota-producer" },
      { ...artifactFixtureLimits, maxArtifacts: 1 }, new MutableArtifactClock(1000));
    await services.schema.initialize();
    const request = { name: "report.txt", kind: "report", mediaType: "text/plain", schemaId: null, schemaVersion: null,
      sourceRefs: [], expiresAtEpochMs: null, data: new TextEncoder().encode("fixture") };
    const results = await Promise.allSettled([
      services.store.write({ ...request, idempotencyKey: "a" }),
      services.store.write({ ...request, idempotencyKey: "b" }),
    ]);
    if (results.filter(result => result.status === "fulfilled").length !== 1 ||
        results.filter(result => result.status === "rejected" && result.reason instanceof ArtifactError && result.reason.code === "ARTIFACT_LIMIT").length !== 1) {
      throw new Error("Concurrent artifact writes bypassed the scope quota.");
    }
  } finally { await harness.close(); }
}
