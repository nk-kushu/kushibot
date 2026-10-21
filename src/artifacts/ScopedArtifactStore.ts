import type { IArtifactStore } from "./IArtifactStore.js";
import type { IArtifactRangeReader } from "./IArtifactRangeReader.js";
import type { IArtifactStorageAdapter } from "./IArtifactStorageAdapter.js";
import type { IArtifactDigest } from "./IArtifactDigest.js";
import type { ArtifactRef } from "./ArtifactRef.js";
import type { ArtifactMetadata } from "./ArtifactMetadata.js";
import type { ArtifactWriteRequest } from "./ArtifactWriteRequest.js";
import type { ArtifactDocument } from "./ArtifactDocument.js";
import type { ArtifactSlice } from "./ArtifactSlice.js";
import type { ArtifactLimits } from "./ArtifactLimits.js";
import type { ArtifactCaptureDecision } from "./ArtifactCaptureDecision.js";
import type { IPolicy } from "../contracts/IPolicy.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { ExecutionIdentity } from "../contracts/runtime/ExecutionIdentity.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import { ExecutionIdentityContract } from "../contracts/runtime/ExecutionIdentityContract.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { Base64ArtifactEncoding } from "../persistence/artifacts/Base64ArtifactEncoding.js";
import { validateArtifactLimits } from "./validateArtifactLimits.js";
import { ArtifactError } from "../errors/ArtifactError.js";

export class ScopedArtifactStore implements IArtifactStore, IArtifactRangeReader {
  private readonly limits: ArtifactLimits;
  private readonly scope: ExecutionScopeRef;
  private readonly producer: ExecutionIdentity;
  constructor(private readonly storage: IArtifactStorageAdapter, private readonly digest: IArtifactDigest,
    private readonly encoding: Base64ArtifactEncoding, private readonly clock: IClock,
    private readonly ids: IIdGenerator, scope: ExecutionScopeRef, producer: ExecutionIdentity,
    limits: ArtifactLimits, private readonly capture: IPolicy<ArtifactWriteRequest, ArtifactCaptureDecision>,
    private readonly json: JsonValueContract, private readonly identities: ExecutionIdentityContract) {
    this.limits = validateArtifactLimits(limits);
    this.scope = Object.freeze({ ...scope });
    this.producer = Object.freeze({ ...producer });
  }

  async write(request: ArtifactWriteRequest, signal?: AbortSignal): Promise<ArtifactRef> {
    this.check(signal);
    if (!(request.data instanceof Uint8Array) || request.data.byteLength > this.limits.maxArtifactBytes ||
        !Array.isArray(request.sourceRefs) || request.sourceRefs.length > 100) {
      throw new ArtifactError("ARTIFACT_LIMIT", "Artifact input exceeds its capture bounds.");
    }
    const input = { ...request, sourceRefs: Object.freeze([...request.sourceRefs]), data: new Uint8Array(request.data) };
    const producer = await this.identities.validate(this.producer);
    if (!producer.valid) throw new ArtifactError("ARTIFACT_INVALID", "Invalid producer identity.");
    const decision = await this.capture.apply({ ...input, data: new Uint8Array(input.data) });
    if (decision.allowed !== true) throw new ArtifactError("ARTIFACT_DENIED", "Artifact capture was rejected.");
    const wholeDigest = await this.digest.hash(input.data);
    const fingerprintData = await this.json.validate({
      scope: this.scope, producer: producer.value, name: input.name, kind: input.kind,
      mediaType: input.mediaType, schemaId: input.schemaId, schemaVersion: input.schemaVersion,
      sourceRefs: input.sourceRefs, idempotencyKey: input.idempotencyKey,
      expiresAtEpochMs: input.expiresAtEpochMs, digest: wholeDigest, byteLength: input.data.byteLength,
    });
    if (!fingerprintData.valid) throw new ArtifactError("ARTIFACT_INVALID", "Invalid artifact request metadata.");
    const fingerprint = await this.digest.hash(new TextEncoder().encode(JSON.stringify(fingerprintData.value)));
    const previous = await this.storage.findOperation(producer.value.operationId, input.idempotencyKey);
    if (previous !== null) {
      if (previous.fingerprint !== fingerprint) throw new ArtifactError("ARTIFACT_CONFLICT", "Producer key was reused for another artifact.");
      return (await this.info(previous.ref, signal)).ref;
    }
    const now = this.clock.nowEpochMs();
    if (input.expiresAtEpochMs !== null && (!Number.isSafeInteger(input.expiresAtEpochMs) || input.expiresAtEpochMs <= now)) {
      throw new ArtifactError("ARTIFACT_INVALID", "Artifact expiry must be in the future.");
    }
    const chunks: string[] = [];
    const chunkDigests: string[] = [];
    for (let offset = 0; offset < input.data.length; offset += this.limits.chunkBytes) {
      this.check(signal);
      const chunk = input.data.slice(offset, offset + this.limits.chunkBytes);
      chunks.push(this.encoding.encode(chunk));
      chunkDigests.push(await this.digest.hash(chunk));
    }
    const metadata: ArtifactMetadata = {
      schemaVersion: 1, ref: { artifactId: this.ids.nextId(), digest: wholeDigest, byteLength: input.data.byteLength,
        mediaType: input.mediaType, schemaId: input.schemaId, schemaVersion: input.schemaVersion },
      scope: this.scope, producer: producer.value, name: input.name, kind: input.kind, sourceRefs: input.sourceRefs,
      idempotencyKey: input.idempotencyKey, fingerprint, createdAtEpochMs: now, expiresAtEpochMs: input.expiresAtEpochMs,
      chunkBytes: this.limits.chunkBytes, chunkDigests,
    };
    this.check(signal);
    const stored = await this.storage.putOnce(metadata, chunks, this.limits);
    // Cancellation during commit may leave a ready, pinned artifact; retry the same producer/key.
    this.check(signal);
    return (await this.info(stored.ref, signal)).ref;
  }

  async info(reference: ArtifactRef, signal?: AbortSignal): Promise<ArtifactMetadata> {
    this.check(signal);
    const available = await this.storage.load(reference.artifactId);
    if (available === null) throw new ArtifactError("ARTIFACT_MISSING", "Artifact is missing or unavailable in this scope.");
    const ref = available.metadata.ref;
    if (ref.digest !== reference.digest || ref.byteLength !== reference.byteLength || ref.mediaType !== reference.mediaType ||
        ref.schemaId !== reference.schemaId || ref.schemaVersion !== reference.schemaVersion) {
      throw new ArtifactError("ARTIFACT_CORRUPT", "Artifact reference does not match saved content.");
    }
    if (available.metadata.expiresAtEpochMs !== null && available.metadata.expiresAtEpochMs <= this.clock.nowEpochMs() && available.pinCount === 0) {
      throw new ArtifactError("ARTIFACT_EXPIRED", "Artifact has expired.");
    }
    if (ref.byteLength > this.limits.maxArtifactBytes) throw new ArtifactError("ARTIFACT_LIMIT", "Artifact exceeds current read capacity.");
    this.check(signal);
    return available.metadata;
  }

  async read(reference: ArtifactRef, maxBytes: number, signal?: AbortSignal): Promise<ArtifactDocument> {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > this.limits.maxArtifactBytes) {
      throw new ArtifactError("ARTIFACT_LIMIT", "Invalid complete-read bound.");
    }
    const metadata = await this.info(reference, signal);
    if (metadata.ref.byteLength > maxBytes) throw new ArtifactError("ARTIFACT_LIMIT", "Complete artifact does not fit; use an explicit reader.");
    const slice = await this.readSlice(reference, 0, metadata.ref.byteLength, this.limits.maxArtifactBytes, signal);
    if (await this.digest.hash(slice.data) !== metadata.ref.digest) throw new ArtifactError("ARTIFACT_CORRUPT", "Whole-artifact digest mismatch.");
    this.check(signal);
    return { metadata, data: slice.data };
  }

  async readSlice(reference: ArtifactRef, offset: number, length: number, maxScannedBytes: number, signal?: AbortSignal): Promise<ArtifactSlice> {
    const metadata = await this.info(reference, signal);
    if (![offset, length, maxScannedBytes].every(value => Number.isSafeInteger(value) && value >= 0) ||
        offset > metadata.ref.byteLength || length > this.limits.maxArtifactBytes || maxScannedBytes > this.limits.maxArtifactBytes) {
      throw new ArtifactError("ARTIFACT_LIMIT", "Invalid byte range.");
    }
    const end = Math.min(metadata.ref.byteLength, offset + length);
    if (end === offset) return { data: new Uint8Array(), scannedBytes: 0 };
    const first = Math.floor(offset / metadata.chunkBytes);
    const last = Math.floor((end - 1) / metadata.chunkBytes);
    const scannedBytes = Math.min(metadata.ref.byteLength, (last + 1) * metadata.chunkBytes) - first * metadata.chunkBytes;
    if (scannedBytes > maxScannedBytes) throw new ArtifactError("ARTIFACT_LIMIT", "Verifying this range exceeds the scan budget.");
    const output = new Uint8Array(end - offset);
    for (let index = first; index <= last; index += 1) {
      this.check(signal);
      const encoded = await this.storage.readChunk(reference.artifactId, index);
      if (encoded === null) throw new ArtifactError("ARTIFACT_MISSING", "Required content chunk is missing.");
      const expectedLength = Math.min(metadata.chunkBytes, metadata.ref.byteLength - index * metadata.chunkBytes);
      if (encoded.length !== Math.ceil(expectedLength / 3) * 4) {
        throw new ArtifactError("ARTIFACT_CORRUPT", "Encoded chunk size does not match its manifest.");
      }
      const chunk = this.encoding.decode(encoded);
      if (chunk.byteLength !== expectedLength || await this.digest.hash(chunk) !== metadata.chunkDigests[index]) {
        throw new ArtifactError("ARTIFACT_CORRUPT", "Artifact chunk integrity failed.");
      }
      const from = Math.max(offset, index * metadata.chunkBytes);
      const to = Math.min(end, (index + 1) * metadata.chunkBytes);
      output.set(chunk.subarray(from - index * metadata.chunkBytes, to - index * metadata.chunkBytes), from - offset);
    }
    this.check(signal);
    return { data: output, scannedBytes };
  }
  private check(signal?: AbortSignal): void {
    if (signal?.aborted) throw new ArtifactError("ARTIFACT_CANCELLED", "Artifact operation was cancelled; committed effects may remain.");
  }
}
