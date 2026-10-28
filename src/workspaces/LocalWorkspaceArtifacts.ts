import { createHash, randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AllowListedArtifactCapturePolicy } from "../artifacts/AllowListedArtifactCapturePolicy.js";
import { Sha256ArtifactDigest } from "../artifacts/Sha256ArtifactDigest.js";
import { SqliteArtifactStoreFactory } from "../persistence/sqlite/SqliteArtifactStoreFactory.js";
import type { ArtifactServices } from "../artifacts/ArtifactServices.js";
import { NodeSqliteDatabase } from "../persistence/sqlite/NodeSqliteDatabase.js";

/** Persistent local workspace artifacts, shared by coding and publication hosts. */
export class LocalWorkspaceArtifacts {
  private constructor(
    readonly services: ArtifactServices,
    private readonly database: NodeSqliteDatabase,
  ) {}

  static async open(
    workspace: string,
    directory = path.join(os.homedir(), ".kushex", "artifacts"),
  ): Promise<LocalWorkspaceArtifacts> {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const scopeId = createHash("sha256").update(path.resolve(workspace)).digest("hex");
    const database = new NodeSqliteDatabase(path.join(directory, `${scopeId}.sqlite`));
    try {
      const services = new SqliteArtifactStoreFactory({
        database,
        scope: { scopeId, projectId: "coding-chat" },
        limits: {
          maxArtifactBytes: 1_048_576,
          maxArtifacts: 100_000,
          maxStoredBytes: 1_073_741_824,
          chunkBytes: 16_384,
          maxPageBytes: 65_536,
          maxPageLines: 256,
          maxSearchScanBytes: 1_048_576,
          maxSearchMatches: 100,
          maxPinsPerArtifact: 16,
          maxCursors: 128,
          cursorTtlMs: 60_000,
        },
        digest: new Sha256ArtifactDigest(globalThis.crypto.subtle),
        clock: { nowEpochMs: () => Date.now() },
        ids: { nextId: () => randomUUID() },
        capture: new AllowListedArtifactCapturePolicy(["application/json", "text/plain"]),
        metadataMaxBytes: 65_536,
      }).create({ operationId: randomUUID() });
      await services.schema.initialize();
      return new LocalWorkspaceArtifacts(services, database);
    } catch (error) {
      await database.close();
      throw error;
    }
  }

  close(): Promise<void> {
    return this.database.close();
  }
}
