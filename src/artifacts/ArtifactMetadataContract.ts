import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { ArtifactMetadata } from "./ArtifactMetadata.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { ExecutionIdentityContract } from "../contracts/runtime/ExecutionIdentityContract.js";

export class ArtifactMetadataContract implements IResultContract<ArtifactMetadata> {
  readonly id = "artifact-metadata";
  readonly version = "1";
  constructor(private readonly json: JsonValueContract, private readonly identities: ExecutionIdentityContract) {}

  async validate(value: unknown): Promise<ValidationResult<ArtifactMetadata>> {
    const canonical = await this.json.validate(value);
    if (!canonical.valid || !this.record(canonical.value)) return this.invalid();
    const data = canonical.value;
    if (!this.exact(data, ["schemaVersion", "ref", "scope", "producer", "name", "kind", "sourceRefs", "idempotencyKey",
      "fingerprint", "createdAtEpochMs", "expiresAtEpochMs", "chunkBytes", "chunkDigests"]) ||
      data.schemaVersion !== 1 || !this.record(data.ref) ||
      !this.exact(data.ref, ["artifactId", "digest", "byteLength", "mediaType", "schemaId", "schemaVersion"]) ||
      !this.text(data.ref.artifactId) || !this.hash(data.ref.digest) || !this.integer(data.ref.byteLength, 0) ||
      !this.text(data.ref.mediaType) || !this.schema(data.ref.schemaId, data.ref.schemaVersion) ||
      !this.record(data.scope) || !this.text(data.scope.scopeId) || !this.text(data.scope.projectId) ||
      Object.keys(data.scope).some(key => !["scopeId", "projectId", "workspaceId"].includes(key)) ||
      ("workspaceId" in data.scope && !this.text(data.scope.workspaceId)) ||
      !this.text(data.name) || data.name.length > 256 || !this.text(data.kind) || data.kind.length > 128 ||
      !this.text(data.idempotencyKey) || data.idempotencyKey.length > 256 || !this.hash(data.fingerprint) ||
      !this.integer(data.createdAtEpochMs, 0) || !(data.expiresAtEpochMs === null ||
        (this.integer(data.expiresAtEpochMs, 0) && data.expiresAtEpochMs > data.createdAtEpochMs)) ||
      !this.integer(data.chunkBytes, 1) || !Array.isArray(data.chunkDigests) || !data.chunkDigests.every(item => this.hash(item)) ||
      data.chunkDigests.length !== Math.ceil(data.ref.byteLength / data.chunkBytes) ||
      !Array.isArray(data.sourceRefs) || data.sourceRefs.length > 100 || !data.sourceRefs.every(item => this.text(item))) return this.invalid();
    if (!(await this.identities.validate(data.producer)).valid) return this.invalid();
    // All fields were validated against this versioned shape above.
    return { valid: true, value: data as ArtifactMetadata };
  }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
  private exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
    return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwnProperty.call(value, key));
  }
  private text(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
  private hash(value: unknown): value is string { return typeof value === "string" && /^[a-f0-9]{64}$/.test(value); }
  private integer(value: unknown, minimum: number): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum; }
  private schema(id: unknown, version: unknown): boolean { return (id === null && version === null) || (this.text(id) && this.text(version)); }
  private invalid(): ValidationResult<ArtifactMetadata> {
    return { valid: false, issues: [{ path: [], code: "invalid-artifact-metadata", message: "Artifact metadata is invalid or incompatible." }] };
  }
}
