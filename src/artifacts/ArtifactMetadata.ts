import type { ArtifactRef } from "./ArtifactRef.js";
import type { ExecutionIdentity } from "../contracts/runtime/ExecutionIdentity.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";

export type ArtifactMetadata = Readonly<{
  schemaVersion: 1;
  ref: ArtifactRef;
  scope: ExecutionScopeRef;
  producer: ExecutionIdentity;
  name: string; kind: string; sourceRefs: readonly string[];
  idempotencyKey: string; fingerprint: string;
  createdAtEpochMs: number; expiresAtEpochMs: number | null;
  chunkBytes: number; chunkDigests: readonly string[];
}>;
