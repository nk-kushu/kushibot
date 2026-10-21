import type { IArtifactStorageAdapter } from "../../artifacts/IArtifactStorageAdapter.js";
import type { ArtifactMetadata } from "../../artifacts/ArtifactMetadata.js";
import type { ArtifactAvailability } from "../../artifacts/ArtifactAvailability.js";
import type { ArtifactLimits } from "../../artifacts/ArtifactLimits.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec.js";
import type { ISqlDatabase } from "../sql/ISqlDatabase.js";
import type { ISqlExecutor } from "../sql/ISqlExecutor.js";
import type { ArtifactStatements } from "./ArtifactStatements.js";
import { ArtifactError } from "../../errors/ArtifactError.js";
import { InvalidPersistenceRecordError } from "../../errors/InvalidPersistenceRecordError.js";

export class SqlArtifactStorageAdapter implements IArtifactStorageAdapter {
  private readonly scope: ExecutionScopeRef;
  constructor(private readonly database: ISqlDatabase, private readonly sql: ArtifactStatements,
    private readonly codec: IRecordCodec<ArtifactMetadata>, scope: ExecutionScopeRef) {
    this.scope = Object.freeze({ ...scope });
  }

  async putOnce(metadata: ArtifactMetadata, encodedChunks: readonly string[], limits: ArtifactLimits): Promise<ArtifactMetadata> {
    const serialized = await this.codec.encode(metadata);
    const candidate = await this.codec.decode(serialized);
    this.checkScope(candidate);
    const chunks = [...encodedChunks];
    if (chunks.length !== candidate.chunkDigests.length || candidate.ref.byteLength > limits.maxArtifactBytes) {
      throw new ArtifactError("ARTIFACT_INVALID", "Invalid content manifest.");
    }
    return this.database.transaction(async transaction => {
      await this.lock(transaction);
      const prior = await transaction.query(this.sql.findOperation, [this.scope.scopeId, this.scope.projectId,
        candidate.producer.operationId, candidate.idempotencyKey]);
      if (prior.rows.length > 0) {
        const existing = await this.decode(prior.rows[0].metadata);
        if (existing.fingerprint !== candidate.fingerprint) throw new ArtifactError("ARTIFACT_CONFLICT", "Producer key was reused for different content.");
        return existing;
      }
      const totals = (await transaction.query(this.sql.totals, this.scopeKey())).rows[0];
      if (!totals || typeof totals.object_count !== "number" || typeof totals.byte_count !== "number" ||
          !Number.isSafeInteger(totals.object_count) || !Number.isSafeInteger(totals.byte_count) ||
          totals.object_count < 0 || totals.byte_count < 0) {
        throw new ArtifactError("ARTIFACT_CORRUPT", "Invalid storage quota counters.");
      }
      if (totals.object_count + 1 > limits.maxArtifacts || totals.byte_count + candidate.ref.byteLength > limits.maxStoredBytes) {
        throw new ArtifactError("ARTIFACT_LIMIT", "Artifact storage quota reached.");
      }
      const key = this.key(candidate.ref.artifactId);
      await transaction.query(this.sql.insertMetadata, [...key, candidate.producer.operationId,
        candidate.idempotencyKey, candidate.ref.byteLength, serialized]);
      for (let index = 0; index < chunks.length; index += 1) await transaction.query(this.sql.insertChunk, [...key, index, chunks[index]]);
      await transaction.query(this.sql.insertPin, [...key, `producer:${candidate.producer.operationId}`]);
      return candidate;
    });
  }

  async findOperation(operationId: string, idempotencyKey: string): Promise<ArtifactMetadata | null> {
    const rows = (await this.database.query(this.sql.findOperation,
      [...this.scopeKey(), operationId, idempotencyKey])).rows;
    return rows.length === 0 ? null : this.decode(rows[0].metadata);
  }
  async load(artifactId: string): Promise<ArtifactAvailability | null> {
    return this.database.transaction(async transaction => this.read(transaction, artifactId));
  }
  async readChunk(artifactId: string, index: number): Promise<string | null> {
    const result = await this.database.query(this.sql.readChunk, [...this.key(artifactId), index]);
    if (result.rows.length === 0) return null;
    if (typeof result.rows[0].content !== "string") throw new ArtifactError("ARTIFACT_CORRUPT", "Invalid content chunk.");
    return result.rows[0].content;
  }
  async pin(artifactId: string, pinId: string, nowEpochMs: number, maxPins: number): Promise<void> {
    await this.database.transaction(async transaction => {
      await this.lock(transaction);
      const current = await this.read(transaction, artifactId);
      if (current === null) throw new ArtifactError("ARTIFACT_MISSING", "Artifact is missing.");
      if (current.metadata.expiresAtEpochMs !== null && current.metadata.expiresAtEpochMs <= nowEpochMs && current.pinCount === 0) {
        throw new ArtifactError("ARTIFACT_EXPIRED", "Expired artifact cannot gain a new pin.");
      }
      const key = [...this.key(artifactId), pinId];
      if ((await transaction.query(this.sql.hasPin, key)).rows.length > 0) return;
      if (!pinId.trim() || pinId.length > 256 || current.pinCount >= maxPins) throw new ArtifactError("ARTIFACT_LIMIT", "Pin limit reached.");
      await transaction.query(this.sql.insertPin, key);
    });
  }
  async unpin(artifactId: string, pinId: string): Promise<void> {
    await this.database.transaction(async transaction => {
      await this.lock(transaction);
      await transaction.query(this.sql.deletePin, [...this.key(artifactId), pinId]);
    });
  }
  async deleteExpired(artifactId: string, nowEpochMs: number): Promise<boolean> {
    return this.database.transaction(async transaction => {
      await this.lock(transaction);
      const current = await this.read(transaction, artifactId);
      if (current === null || current.pinCount > 0 || current.metadata.expiresAtEpochMs === null ||
          current.metadata.expiresAtEpochMs > nowEpochMs) return false;
      await transaction.query(this.sql.deleteChunks, this.key(artifactId));
      const deleted = await transaction.query(this.sql.deleteMetadata, this.key(artifactId));
      return deleted.affectedRows === 1;
    });
  }
  private async lock(transaction: ISqlExecutor): Promise<void> {
    await transaction.query(this.sql.ensureScope, this.scopeKey());
    const locked = await transaction.query(this.sql.lockScope, this.scopeKey());
    if (locked.affectedRows !== 1) throw new ArtifactError("ARTIFACT_CORRUPT", "Artifact scope lock failed.");
  }
  private async read(executor: ISqlExecutor, artifactId: string): Promise<ArtifactAvailability | null> {
    const rows = (await executor.query(this.sql.load, this.key(artifactId))).rows;
    if (rows.length === 0) return null;
    const metadata = await this.decode(rows[0].metadata);
    if (metadata.ref.artifactId !== artifactId) throw new ArtifactError("ARTIFACT_CORRUPT", "Stored artifact key mismatch.");
    const pinCount = (await executor.query(this.sql.countPins, this.key(artifactId))).rows[0]?.pin_count;
    if (typeof pinCount !== "number" || !Number.isSafeInteger(pinCount) || pinCount < 0) throw new ArtifactError("ARTIFACT_CORRUPT", "Invalid pin count.");
    return { metadata, pinCount };
  }
  private async decode(value: unknown): Promise<ArtifactMetadata> {
    if (typeof value !== "string") throw new ArtifactError("ARTIFACT_CORRUPT", "Invalid artifact metadata row.");
    try {
      const metadata = await this.codec.decode(value);
      this.checkScope(metadata);
      return metadata;
    } catch (error: unknown) {
      if (!(error instanceof InvalidPersistenceRecordError)) throw error;
      throw new ArtifactError("ARTIFACT_CORRUPT", "Stored artifact metadata is incompatible or corrupt.");
    }
  }
  private checkScope(metadata: ArtifactMetadata): void {
    if (metadata.scope.scopeId !== this.scope.scopeId || metadata.scope.projectId !== this.scope.projectId ||
        metadata.scope.workspaceId !== this.scope.workspaceId) throw new ArtifactError("ARTIFACT_INVALID", "Artifact scope mismatch.");
  }
  private scopeKey(): readonly string[] { return [this.scope.scopeId, this.scope.projectId]; }
  private key(id: string): readonly string[] { return [...this.scopeKey(), id]; }
}
