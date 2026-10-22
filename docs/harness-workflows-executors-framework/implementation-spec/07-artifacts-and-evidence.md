# 07. Artifacts and Evidence

## What We Implement Here

Create immutable, source-bound artifact references, scoped storage, bounded verified reads, UTF-8 text paging/search, and retention pins. SQL adapters commit metadata, content chunks, and the initial producer pin together. Add shared backend checks and an offline report example. Saving an artifact does not mean a test passed, a step result was accepted, or publication was approved.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `artifacts/ArtifactRef.ts` | `type ArtifactRef` |
| `artifacts/ArtifactLimits.ts` | `type ArtifactLimits` |
| `artifacts/ArtifactWriteRequest.ts` | `type ArtifactWriteRequest` |
| `artifacts/ArtifactMetadata.ts` | `type ArtifactMetadata` |
| `artifacts/ArtifactDocument.ts` | `type ArtifactDocument` |
| `artifacts/ArtifactSlice.ts` | `type ArtifactSlice` |
| `artifacts/ArtifactPageRequest.ts` | `type ArtifactPageRequest` |
| `artifacts/ArtifactPage.ts` | `type ArtifactPage` |
| `artifacts/ArtifactSearchRequest.ts` | `type ArtifactSearchRequest` |
| `artifacts/ArtifactSearchResult.ts` | `type ArtifactSearchResult` |
| `artifacts/ArtifactCursorState.ts` | `type ArtifactCursorState` |
| `artifacts/ArtifactEvidenceRef.ts` | `type ArtifactEvidenceRef` |
| `artifacts/IArtifactReader.ts` | `interface IArtifactReader` |
| `artifacts/IArtifactWriter.ts` | `interface IArtifactWriter` |
| `artifacts/IArtifactStore.ts` | `interface IArtifactStore extends IArtifactReader, IArtifactWriter` |
| `artifacts/IArtifactRangeReader.ts` | `interface IArtifactRangeReader` |
| `artifacts/IArtifactPagedReader.ts` | `interface IArtifactPagedReader` |
| `artifacts/IArtifactSearchReader.ts` | `interface IArtifactSearchReader` |
| `artifacts/IArtifactDigest.ts` | `interface IArtifactDigest` |
| `artifacts/IArtifactCursorStore.ts` | `interface IArtifactCursorStore` |
| `artifacts/ArtifactAvailability.ts` | `type ArtifactAvailability` |
| `artifacts/IArtifactStorageAdapter.ts` | `interface IArtifactStorageAdapter` |
| `errors/ArtifactErrorCode.ts` | `type ArtifactErrorCode` |
| `errors/ArtifactError.ts` | `class ArtifactError extends Error` |
| `artifacts/Sha256ArtifactDigest.ts` | `class Sha256ArtifactDigest implements IArtifactDigest` |
| `artifacts/CryptoArtifactIdGenerator.ts` | `class CryptoArtifactIdGenerator implements IIdGenerator` |
| `persistence/artifacts/Base64ArtifactEncoding.ts` | `class Base64ArtifactEncoding` |
| `artifacts/ArtifactMetadataContract.ts` | `class ArtifactMetadataContract implements IResultContract<ArtifactMetadata>` |
| `artifacts/ArtifactCursorStore.ts` | `class ArtifactCursorStore implements IArtifactCursorStore` |
| `persistence/artifacts/ArtifactStatements.ts` | `type ArtifactStatements` |
| `persistence/sqlite/sqliteArtifactStatements.ts` | `const sqliteArtifactStatements` |
| `persistence/postgresql/postgresqlArtifactStatements.ts` | `const postgresqlArtifactStatements` |
| `persistence/artifacts/ArtifactSchema.ts` | `class ArtifactSchema` |
| `persistence/artifacts/SqlArtifactStorageAdapter.ts` | `class SqlArtifactStorageAdapter implements IArtifactStorageAdapter` |
| `artifacts/ArtifactCaptureDecision.ts` | `type ArtifactCaptureDecision` |
| `artifacts/AllowListedArtifactCapturePolicy.ts` | `class AllowListedArtifactCapturePolicy implements IPolicy<ArtifactWriteRequest, ArtifactCaptureDecision>` |
| `artifacts/validateArtifactLimits.ts` | `function validateArtifactLimits(limits)` |
| `artifacts/ScopedArtifactStore.ts` | `class ScopedArtifactStore implements IArtifactStore, IArtifactRangeReader` |
| `artifacts/TextArtifactReader.ts` | `class TextArtifactReader implements IArtifactPagedReader, IArtifactSearchReader` |
| `artifacts/ArtifactRetentionService.ts` | `class ArtifactRetentionService` |
| `artifacts/ArtifactServices.ts` | `type ArtifactServices` |
| `artifacts/ArtifactStoreFactory.ts` | `class ArtifactStoreFactory` |
| `artifacts/ArtifactStoreDependencies.ts` | `type ArtifactStoreDependencies` |
| `persistence/sqlite/SqliteArtifactStoreFactory.ts` | `class SqliteArtifactStoreFactory` |
| `persistence/postgresql/PostgresqlArtifactStoreFactory.ts` | `class PostgresqlArtifactStoreFactory` |
| `tests/fakes/MutableArtifactClock.ts` | `class MutableArtifactClock implements IClock` |
| `tests/fixtures/artifactFixtureLimits.ts` | `const artifactFixtureLimits` |
| `tests/artifacts/IArtifactTestHarness.ts` | `interface IArtifactTestHarness` |
| `tests/artifacts/ArtifactStore.test.ts` | `async function verifyArtifactStore(harness)` |
| `tests/artifacts/ArtifactTextReader.test.ts` | `async function verifyArtifactTextReader(harness)` |
| `tests/artifacts/ArtifactRetention.test.ts` | `async function verifyArtifactRetention(harness)` |
| `tests/artifacts/ArtifactQuota.test.ts` | `async function verifyArtifactQuota(harness)` |
| `examples/artifacts/main.ts` | `async function runArtifactExample(database, crypto, clock)` |
| `index.ts` | `Additional explicit type and value exports` |
| `tests/contracts/ArtifactApi.compile.ts` | `Compile-only artifact API fixture` |


## Rules Specific to These Files

General OOP and coding conventions remain in [01](01-scope-and-implementation-roadmap.md). Reuse [03](03-core-contracts-and-shared-policy.md) contracts, [05](05-execution-identities-and-state-machines.md) identity validation, and [06](06-persistence-and-run-records.md) SQL transactions and bounded JSON codecs. Do not add artifact clients to the existing IExecutionContext or introduce duplicate contracts.

| File or concept | Required rules |
| --- | --- |
| ArtifactRef and metadata | A reference identifies exact bytes and media/schema metadata; it is not a permission token or mutable latest alias. Schema ID/version are either both null or both nonempty strings. Names are display labels, never filesystem paths. Metadata preserves trusted producer identity, exact source references, creation/expiry time, whole digest, and the per-chunk integrity manifest. |
| Evidence | Evidence references describe source and byte coverage. Full/excerpt coverage is not factual validation or a claim that every requirement was checked. Consumers validate expected media/schema and source compatibility before interpreting a report. A page or search match cannot establish full-document validation. Artifact references remain structured data here; if earlier partial outcomes require string references, encode a supported opaque identifier and retain its authoritative metadata rather than casting the object to string. |
| Trusted capture and access | Construct services with a host-authorized scope and producer identity. Recheck stored scope on every metadata load, and exact reference metadata on reads. Cross-scope IDs do not become readable. The host must grant access to the bound service itself and to upstream artifacts; the storage adapter does not authenticate arbitrary callers. Capture policy runs before storage, and its acceptance never grants broader tools or scope. |
| Capture policy | Supply an IPolicy<ArtifactWriteRequest, ArtifactCaptureDecision>. The included allow-list policy only checks media type for controlled examples; it does not detect secrets or redact private reasoning. Trusted production capture must exclude disallowed content before supplying bytes, or inject a stricter policy. The policy receives a copy of input bytes so it cannot mutate the stored capture. |
| Immutable creation | Scope plus producer operation plus idempotencyKey identifies a creation request. Same canonical metadata/bytes returns the same reference; changed bytes, provenance, expiry, or other fingerprinted fields conflict. New check executions need distinct operation IDs/keys. No API replaces bytes under an existing ready reference. A redaction/correction is a separately authorized replacement artifact and dependent-reference change. |
| Durability | This initial adapter deliberately stores content and metadata in the same SQL transaction. A ready row, all chunks, and producer pin commit together; any statement failure rolls them back. No reference is returned before commit. Reuse page-06 real-driver transaction semantics and migration locking. A lost commit acknowledgement is reconciled by repeating the same producer/key and verifying its fingerprint, not by rerunning external checks. |
| Producer pin and result gap | Every successful creation atomically adds producer:<operationId>. It protects the report while the parent result is not yet durably saved. Add a checkpoint/review/consumer pin before releasing producer protection. The later owner must record and reconcile that handoff. Producers cannot use pins to grant publication approval. Failure to finish the parent record must not trigger automatic destructive cleanup. |
| Scope quotas | A scope row is locked inside every write/retention transaction, coordinating writers across verified database connections. Check object count and logical raw bytes under that lock. Base64, metadata, indexes, and database overhead require separate physical disk quotas. Pinned or expired-but-not-cleaned artifacts still consume the quota. maxPinsPerArtifact bounds retained pin records. |
| Limits and resource admission | All constructor bounds are positive safe integers. Requests can narrow page/search/read bounds, not enlarge them. maxArtifactBytes bounds this release's in-memory write/full-read buffer; content larger than that needs a future streaming writer, not hidden buffering. Per-call scannedBytes reports actual verified chunk reads, which may exceed returned bytes. Later usage/admission owners must charge cumulative transfers, time, and repeated calls; per-call caps alone do not establish a run-wide budget. |
| Integrity | Compute SHA-256 over captured bytes and every fixed-size chunk. Metadata is trusted scoped storage; verify read chunks against its manifest and complete reads against the whole digest. Bounded paging reads only necessary chunks, not the whole report. A partial read verifies those chunks, not every unvisited byte. Integrity is not truth or approval. |
| Full reads | read() means the entire artifact within maxBytes. Oversized, missing, expired, cancelled, or corrupt content fails explicitly; never silently truncate. Returned Uint8Array values are new read buffers, not mutable storage references. Large content must use an explicit supported reader. |
| Text paging | TextArtifactReader supports text/plain in UTF-8 with LF line boundaries; CRLF bytes remain intact. Return exact byte and line ranges, done, and nextCursor. Preserve UTF-8 character boundaries and reject invalid text. An oversized line returns a limit error rather than an empty nonadvancing page. Structured JSON and binary content remain supported for complete reads; their paged/record/preview reader implementations are explicit future extensions, not raw text pretending to be complete JSON. |
| Search | Match literal case-sensitive query text in complete lines. Each call scans at most one bounded page and returns done=false with a cursor for remaining coverage. No match in an incomplete scan does not mean absence. Bound query size, matches, returned content bytes, and verified scan bytes. maxBytes bounds UTF-8 match content; tool-response serialization must additionally bound JSON/metadata overhead. Chunk verification may require a larger scan budget than the requested output window; too-small bounds fail explicitly. |
| Cursor binding | Tokens are opaque IDs for bounded server-side state, bound to exact artifact/digest, mode, query, position, and this scoped reader instance. Recheck access on continuation. Tokens have an absolute expiry and a count cap; replay does not extend a token's lifetime. Restart invalidates these initial in-memory cursors, requiring a fresh scan, not a fabricated end-of-file. Production token/ID generation uses cryptographic randomness. |
| Retention | A pin protects both storage and readable lifetime past ordinary expiry. After the final pin is removed, expired content cannot be newly pinned or read. Trusted deletion removes expired unpinned metadata/chunks atomically under the same scope lock. No unrestricted delete or sweeping scheduler is exposed here. Missing metadata after cleanup reports missing; it does not retain a tombstone distinguishing every historical reason. Backups and external retention need their own documented controls. |
| Cancellation | Check the signal before capture, between bounded chunk operations, and before returning. Cancellation is cooperative; an SQL commit may still happen. Keep producer identity and pins so recovery can find committed content. No claim that cancellation undoes saved bytes or that a timed-out database operation never committed. |
| Schema and adapters | Use a separate artifacts/version-1 ledger entry with fixed kushibot_ table names. Initialize explicitly under the page-06 migration lock; do not install servers or touch application tables. SQLite/PostgreSQL profiles are supplied through backend factories, not a provider switch. The SQL binding must normalize object_count, byte_count, and pin_count to nonnegative safe numbers, including PostgreSQL aggregate results. Reuse the normalized real ISqlDatabase binding and safe PersistenceError translation. An interface or mock is not verified backend support. |
| Extension boundary | Keep reader/writer/range, paging/search, and retention capabilities distinct. Grant model tools only their permitted capabilities. New media readers and storage backends implement narrow contracts and are registered by composition; do not add format/backend branches to the engine. Future filesystem/object adapters require their own staged commit/reconciliation protocol; this SQL transaction must not be claimed to cover separate external stores. |
| Examples and verification | Test each real disposable backend, including restart, scope, conflicting idempotency, corruption, text continuation, partial search, pins, expiry, quota races, and cancellation. Add real binding tests for transaction rollback, uncertain commit, concurrent pin/delete and quota races across multiple real connections/processes (not only one queued connection), process interruption, malformed metadata, and required-evidence/result gaps before claiming all recovery guarantees. The shown tests establish their listed cases only. The harness capture policy permits text/plain and application/octet-stream and rejects text/html for the capture-rejection fixture. Runtime check functions must be invoked; ArtifactApi.compile.ts is compile-only. |
| Public API | index.ts is additive to earlier pages. Public backend factories hide internal SQL profiles. Example/test fixtures are not production exports. Construction opens no connections and schedules no cleanup. Schema startup, driver ownership, model/tool exposure, and recurring maintenance remain later orchestration responsibilities. |

## TypeScript Code for Each File

Each heading is one file. Reuse earlier contracts/code. Examples require an injected database binding and crypto/time capabilities; they do not open application resources implicitly.

### `artifacts/ArtifactRef.ts`

Identifies immutable content by ID, digest, exact byte length, media type, and optional schema contract.

```typescript
export type ArtifactRef = Readonly<{
  artifactId: string;
  digest: string;
  byteLength: number;
  mediaType: string;
  schemaId: string | null;
  schemaVersion: string | null;
}>;
```

### `artifacts/ArtifactLimits.ts`

Defines constructor-supplied object, quota, chunk, paging, search, pin, and cursor bounds.

```typescript
export type ArtifactLimits = Readonly<{
  maxArtifactBytes: number; maxArtifacts: number; maxStoredBytes: number;
  chunkBytes: number; maxPageBytes: number; maxPageLines: number;
  maxSearchScanBytes: number; maxSearchMatches: number; maxPinsPerArtifact: number;
  maxCursors: number; cursorTtlMs: number;
}>;
```

### `artifacts/ArtifactWriteRequest.ts`

Contains already capture-approved bytes and source provenance for one producer operation and idempotency key.

```typescript
export type ArtifactWriteRequest = Readonly<{
  name: string; kind: string; mediaType: string;
  schemaId: string | null; schemaVersion: string | null;
  sourceRefs: readonly string[];
  idempotencyKey: string;
  expiresAtEpochMs: number | null;
  data: Uint8Array;
}>;
```

### `artifacts/ArtifactMetadata.ts`

Records immutable provenance, whole-content and chunk integrity, expiration, and the write fingerprint.

```typescript
import type { ArtifactRef } from "./ArtifactRef";
import type { ExecutionIdentity } from "../contracts/runtime/ExecutionIdentity";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";

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
```

### `artifacts/ArtifactDocument.ts`

Returns a complete verified artifact with a fresh copy of its bytes.

```typescript
import type { ArtifactMetadata } from "./ArtifactMetadata";

export type ArtifactDocument = Readonly<{ metadata: ArtifactMetadata; data: Uint8Array }>;
```

### `artifacts/ArtifactSlice.ts`

Returns a bounded byte range plus the number of chunk bytes actually read and verified.

```typescript
export type ArtifactSlice = Readonly<{ data: Uint8Array; scannedBytes: number }>;
```

### `artifacts/ArtifactPageRequest.ts`

Requests a bounded plain-text page using an optional opaque continuation cursor.

```typescript
import type { ArtifactRef } from "./ArtifactRef";

export type ArtifactPageRequest = Readonly<{
  reference: ArtifactRef; cursor?: string; maxLines: number; maxBytes: number;
}>;
```

### `artifacts/ArtifactPage.ts`

Reports exact page coverage, verified read cost, and continuation rather than pretending an excerpt is a complete document.

```typescript
import type { ArtifactRef } from "./ArtifactRef";

export type ArtifactPage = Readonly<{
  reference: ArtifactRef; content: string;
  range: Readonly<{ firstLine: number | null; lastLine: number | null; startByte: number; endByteExclusive: number }>;
  scannedBytes: number; done: boolean; nextCursor: string | null;
}>;
```

### `artifacts/ArtifactSearchRequest.ts`

Requests a bounded literal search of plain text, with separate scan and returned-output limits.

```typescript
import type { ArtifactRef } from "./ArtifactRef";

export type ArtifactSearchRequest = Readonly<{
  reference: ArtifactRef; query: string; cursor?: string;
  maxMatches: number; maxBytes: number; maxScanBytes: number;
}>;
```

### `artifacts/ArtifactSearchResult.ts`

Returns located matching lines and an explicit indication of remaining unsearched coverage.

```typescript
import type { ArtifactRef } from "./ArtifactRef";

export type ArtifactSearchResult = Readonly<{
  reference: ArtifactRef;
  matches: readonly Readonly<{ line: number; startByte: number; endByteExclusive: number; content: string }>[];
  scannedBytes: number; done: boolean; nextCursor: string | null;
}>;
```

### `artifacts/ArtifactCursorState.ts`

Binds server-side continuation state to exact content, operation mode, query, and the next line boundary.

```typescript
export type ArtifactCursorState = Readonly<{
  artifactId: string; digest: string; mode: "page" | "search"; query: string;
  offset: number; nextLine: number;
}>;
```

### `artifacts/ArtifactEvidenceRef.ts`

Carries source-bound full or excerpt evidence references without claiming that the cited content proves a conclusion.

```typescript
import type { ArtifactRef } from "./ArtifactRef";

export type ArtifactEvidenceRef = Readonly<{
  artifact: ArtifactRef;
  sourceRefs: readonly string[];
  coverage: "full" | "excerpt";
  startByte: number; endByteExclusive: number;
}>;
```

### `artifacts/IArtifactReader.ts`

Defines complete reads that must fit their explicit byte limit and never silently truncate.

```typescript
import type { ArtifactRef } from "./ArtifactRef";
import type { ArtifactDocument } from "./ArtifactDocument";

export interface IArtifactReader {
  read(reference: ArtifactRef, maxBytes: number, signal?: AbortSignal): Promise<ArtifactDocument>;
}
```

### `artifacts/IArtifactWriter.ts`

Defines creation of immutable artifacts under a trusted producer context.

```typescript
import type { ArtifactWriteRequest } from "./ArtifactWriteRequest";
import type { ArtifactRef } from "./ArtifactRef";

export interface IArtifactWriter {
  write(request: ArtifactWriteRequest, signal?: AbortSignal): Promise<ArtifactRef>;
}
```

### `artifacts/IArtifactStore.ts`

Combines read and write capabilities; read-only consumers should receive only the reader interface.

```typescript
import type { IArtifactReader } from "./IArtifactReader";
import type { IArtifactWriter } from "./IArtifactWriter";

export interface IArtifactStore extends IArtifactReader, IArtifactWriter {}
```

### `artifacts/IArtifactRangeReader.ts`

Provides verified bounded slices to registered document readers, without exposing an unrestricted storage client.

```typescript
import type { ArtifactRef } from "./ArtifactRef";
import type { ArtifactMetadata } from "./ArtifactMetadata";
import type { ArtifactSlice } from "./ArtifactSlice";

export interface IArtifactRangeReader {
  info(reference: ArtifactRef, signal?: AbortSignal): Promise<ArtifactMetadata>;
  readSlice(reference: ArtifactRef, offset: number, length: number, maxScannedBytes: number, signal?: AbortSignal): Promise<ArtifactSlice>;
}
```

### `artifacts/IArtifactPagedReader.ts`

Defines explicit paged reading as a separate capability from complete reads.

```typescript
import type { ArtifactPageRequest } from "./ArtifactPageRequest";
import type { ArtifactPage } from "./ArtifactPage";

export interface IArtifactPagedReader {
  readPage(request: ArtifactPageRequest, signal?: AbortSignal): Promise<ArtifactPage>;
}
```

### `artifacts/IArtifactSearchReader.ts`

Defines bounded search with explicit continuation and incomplete coverage.

```typescript
import type { ArtifactSearchRequest } from "./ArtifactSearchRequest";
import type { ArtifactSearchResult } from "./ArtifactSearchResult";

export interface IArtifactSearchReader {
  search(request: ArtifactSearchRequest, signal?: AbortSignal): Promise<ArtifactSearchResult>;
}
```

### `artifacts/IArtifactDigest.ts`

Abstracts cryptographic hashing for whole-content, chunk, and request-fingerprint integrity.

```typescript
export interface IArtifactDigest {
  hash(bytes: Uint8Array): Promise<string>;
}
```

### `artifacts/IArtifactCursorStore.ts`

Stores bounded, expiring, opaque continuation tokens within one scoped reader service.

```typescript
import type { ArtifactCursorState } from "./ArtifactCursorState";

export interface IArtifactCursorStore {
  put(state: ArtifactCursorState): string;
  get(token: string): ArtifactCursorState;
}
```

### `artifacts/ArtifactAvailability.ts`

Returns validated metadata and current pin count without loading artifact content.

```typescript
import type { ArtifactMetadata } from "./ArtifactMetadata";

export type ArtifactAvailability = Readonly<{ metadata: ArtifactMetadata; pinCount: number }>;
```

### `artifacts/IArtifactStorageAdapter.ts`

Defines atomic content/metadata creation, bounded chunk access, and coordinated retention operations.

```typescript
import type { ArtifactMetadata } from "./ArtifactMetadata";
import type { ArtifactAvailability } from "./ArtifactAvailability";
import type { ArtifactLimits } from "./ArtifactLimits";

export interface IArtifactStorageAdapter {
  putOnce(metadata: ArtifactMetadata, encodedChunks: readonly string[], limits: ArtifactLimits): Promise<ArtifactMetadata>;
  findOperation(operationId: string, idempotencyKey: string): Promise<ArtifactMetadata | null>;
  load(artifactId: string): Promise<ArtifactAvailability | null>;
  readChunk(artifactId: string, index: number): Promise<string | null>;
  pin(artifactId: string, pinId: string, nowEpochMs: number, maxPins: number): Promise<void>;
  unpin(artifactId: string, pinId: string): Promise<void>;
  deleteExpired(artifactId: string, nowEpochMs: number): Promise<boolean>;
}
```

### `errors/ArtifactErrorCode.ts`

Distinguishes denied, missing, expired, corrupt, limited, cancelled, conflicting, unsupported, and invalid-cursor artifact outcomes.

```typescript
export type ArtifactErrorCode =
  | "ARTIFACT_DENIED" | "ARTIFACT_MISSING" | "ARTIFACT_EXPIRED" | "ARTIFACT_CORRUPT"
  | "ARTIFACT_LIMIT" | "ARTIFACT_CANCELLED" | "ARTIFACT_CONFLICT"
  | "ARTIFACT_UNSUPPORTED" | "ARTIFACT_CURSOR_INVALID" | "ARTIFACT_INVALID";
```

### `errors/ArtifactError.ts`

Reports a typed artifact failure using a safe message; it is not a framework base class.

```typescript
import type { ArtifactErrorCode } from "./ArtifactErrorCode";

export class ArtifactError extends Error {
  constructor(readonly code: ArtifactErrorCode, message: string) {
    super(message);
    this.name = "ArtifactError";
  }
}
```

### `artifacts/Sha256ArtifactDigest.ts`

Computes lowercase SHA-256 digests through an injected standard Web Crypto capability.

```typescript
import type { IArtifactDigest } from "./IArtifactDigest";

export class Sha256ArtifactDigest implements IArtifactDigest {
  constructor(private readonly subtle: SubtleCrypto) {}

  async hash(bytes: Uint8Array): Promise<string> {
    const digest = await this.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
    return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
  }
}
```

### `artifacts/CryptoArtifactIdGenerator.ts`

Generates random opaque identifiers for artifacts and cursors using injected cryptographic randomness.

```typescript
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";

export class CryptoArtifactIdGenerator implements IIdGenerator {
  constructor(private readonly random: Pick<Crypto, "getRandomValues">) {}

  nextId(): string {
    const bytes = this.random.getRandomValues(new Uint8Array(24));
    return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  }
}
```

### `persistence/artifacts/Base64ArtifactEncoding.ts`

Encodes each bounded binary chunk into portable SQL text and rejects malformed base64 on read.

```typescript
import { ArtifactError } from "../../errors/ArtifactError";

export class Base64ArtifactEncoding {
  encode(bytes: Uint8Array): string {
    let value = "";
    for (const byte of bytes) value += String.fromCharCode(byte);
    return btoa(value);
  }

  decode(value: string): Uint8Array {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
      throw new ArtifactError("ARTIFACT_CORRUPT", "Stored content is not valid base64.");
    }
    const decoded = atob(value);
    const bytes = Uint8Array.from(decoded, char => char.charCodeAt(0));
    if (this.encode(bytes) !== value) throw new ArtifactError("ARTIFACT_CORRUPT", "Noncanonical stored content.");
    return bytes;
  }
}
```

### `artifacts/ArtifactMetadataContract.ts`

Validates immutable references, provenance, hash manifests, and exact chunk counts before metadata is trusted.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { ArtifactMetadata } from "./ArtifactMetadata";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ExecutionIdentityContract } from "../contracts/runtime/ExecutionIdentityContract";

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
```

### `artifacts/ArtifactCursorStore.ts`

Stores opaque scoped continuations with an absolute expiry and a bounded number of retained tokens.

```typescript
import type { IArtifactCursorStore } from "./IArtifactCursorStore";
import type { ArtifactCursorState } from "./ArtifactCursorState";
import type { IClock } from "../contracts/runtime/IClock";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import { ArtifactError } from "../errors/ArtifactError";

export class ArtifactCursorStore implements IArtifactCursorStore {
  private readonly entries = new Map<string, Readonly<{ expiresAt: number; state: ArtifactCursorState }>>();
  constructor(private readonly clock: IClock, private readonly ids: IIdGenerator,
    private readonly maxEntries: number, private readonly ttlMs: number) {
    if (![maxEntries, ttlMs].every(value => Number.isSafeInteger(value) && value > 0)) {
      throw new ArtifactError("ARTIFACT_INVALID", "Invalid cursor-store bounds.");
    }
  }

  put(state: ArtifactCursorState): string {
    if (!Number.isSafeInteger(state.offset) || state.offset < 0 || !Number.isSafeInteger(state.nextLine) || state.nextLine < 1 ||
        !state.artifactId || !/^[a-f0-9]{64}$/.test(state.digest) || !["page", "search"].includes(state.mode)) {
      throw new ArtifactError("ARTIFACT_CURSOR_INVALID", "Invalid cursor state.");
    }
    const now = this.clock.nowEpochMs();
    for (const [token, entry] of this.entries) if (entry.expiresAt <= now) this.entries.delete(token);
    if (this.entries.size >= this.maxEntries || !Number.isSafeInteger(now + this.ttlMs)) {
      throw new ArtifactError("ARTIFACT_LIMIT", "Cursor capacity reached.");
    }
    const token = this.ids.nextId();
    if (!token || token.length > 256 || this.entries.has(token)) throw new ArtifactError("ARTIFACT_CONFLICT", "Cursor identity collided.");
    this.entries.set(token, Object.freeze({ expiresAt: now + this.ttlMs, state: Object.freeze({ ...state }) }));
    return token;
  }
  get(token: string): ArtifactCursorState {
    const entry = this.entries.get(token);
    if (entry === undefined || entry.expiresAt <= this.clock.nowEpochMs()) {
      this.entries.delete(token);
      throw new ArtifactError("ARTIFACT_CURSOR_INVALID", "Cursor is missing or expired.");
    }
    return entry.state;
  }
}
```

### `persistence/artifacts/ArtifactStatements.ts`

Defines immutable schema and parameterized backend statements for atomic artifacts, chunks, pins, and scope quotas.

```typescript
export type ArtifactStatements = Readonly<{
  schema: readonly string[]; readVersion: string; installVersion: string;
  ensureScope: string; lockScope: string; totals: string;
  findOperation: string; load: string; insertMetadata: string; insertChunk: string; readChunk: string;
  countPins: string; hasPin: string; insertPin: string; deletePin: string;
  deleteChunks: string; deleteMetadata: string;
}>;
```

### `persistence/sqlite/sqliteArtifactStatements.ts`

Defines sqlite statements with fixed framework table names; schema changes use the artifact migration ledger.

```typescript
import type { ArtifactStatements } from "../artifacts/ArtifactStatements";

export const sqliteArtifactStatements: ArtifactStatements = Object.freeze({
  schema: Object.freeze([
    "CREATE TABLE IF NOT EXISTS kushibot_schema_versions (name TEXT PRIMARY KEY, version INTEGER NOT NULL CHECK (version > 0))",
    "CREATE TABLE IF NOT EXISTS kushibot_artifact_scopes (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, revision BIGINT NOT NULL, PRIMARY KEY(scope_id, project_id))",
    "CREATE TABLE IF NOT EXISTS kushibot_artifacts (\nscope_id TEXT NOT NULL, project_id TEXT NOT NULL, artifact_id TEXT NOT NULL,\nproducer_operation_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, byte_length BIGINT NOT NULL CHECK(byte_length >= 0), metadata TEXT NOT NULL,\nPRIMARY KEY(scope_id, project_id, artifact_id), UNIQUE(scope_id, project_id, producer_operation_id, idempotency_key))",
    "CREATE TABLE IF NOT EXISTS kushibot_artifact_chunks (\nscope_id TEXT NOT NULL, project_id TEXT NOT NULL, artifact_id TEXT NOT NULL, chunk_index INTEGER NOT NULL CHECK(chunk_index >= 0), content TEXT NOT NULL,\nPRIMARY KEY(scope_id, project_id, artifact_id, chunk_index))",
    "CREATE TABLE IF NOT EXISTS kushibot_artifact_pins (\nscope_id TEXT NOT NULL, project_id TEXT NOT NULL, artifact_id TEXT NOT NULL, pin_id TEXT NOT NULL,\nPRIMARY KEY(scope_id, project_id, artifact_id, pin_id))",
  ]),
  readVersion: "SELECT version FROM kushibot_schema_versions WHERE name = 'artifacts'",
  installVersion: "INSERT INTO kushibot_schema_versions(name, version) VALUES('artifacts', 1)",
  ensureScope: "INSERT INTO kushibot_artifact_scopes(scope_id, project_id, revision) VALUES(?, ?, 0) ON CONFLICT(scope_id, project_id) DO NOTHING",
  lockScope: "UPDATE kushibot_artifact_scopes SET revision = revision + 1 WHERE scope_id = ? AND project_id = ?",
  totals: "SELECT COUNT(*) AS object_count, COALESCE(SUM(byte_length), 0) AS byte_count FROM kushibot_artifacts WHERE scope_id = ? AND project_id = ?",
  findOperation: "SELECT metadata FROM kushibot_artifacts WHERE scope_id = ? AND project_id = ? AND producer_operation_id = ? AND idempotency_key = ?",
  load: "SELECT metadata FROM kushibot_artifacts WHERE scope_id = ? AND project_id = ? AND artifact_id = ?",
  insertMetadata: "INSERT INTO kushibot_artifacts(scope_id, project_id, artifact_id, producer_operation_id, idempotency_key, byte_length, metadata) VALUES(?,?,?,?,?,?,?)",
  insertChunk: "INSERT INTO kushibot_artifact_chunks(scope_id, project_id, artifact_id, chunk_index, content) VALUES(?,?,?,?,?)",
  readChunk: "SELECT content FROM kushibot_artifact_chunks WHERE scope_id = ? AND project_id = ? AND artifact_id = ? AND chunk_index = ?",
  countPins: "SELECT COUNT(*) AS pin_count FROM kushibot_artifact_pins WHERE scope_id = ? AND project_id = ? AND artifact_id = ?",
  hasPin: "SELECT pin_id FROM kushibot_artifact_pins WHERE scope_id = ? AND project_id = ? AND artifact_id = ? AND pin_id = ?",
  insertPin: "INSERT INTO kushibot_artifact_pins(scope_id, project_id, artifact_id, pin_id) VALUES(?,?,?,?) ON CONFLICT(scope_id, project_id, artifact_id, pin_id) DO NOTHING",
  deletePin: "DELETE FROM kushibot_artifact_pins WHERE scope_id = ? AND project_id = ? AND artifact_id = ? AND pin_id = ?",
  deleteChunks: "DELETE FROM kushibot_artifact_chunks WHERE scope_id = ? AND project_id = ? AND artifact_id = ?",
  deleteMetadata: "DELETE FROM kushibot_artifacts WHERE scope_id = ? AND project_id = ? AND artifact_id = ?",
});
```

### `persistence/postgresql/postgresqlArtifactStatements.ts`

Defines postgresql statements with fixed framework table names; schema changes use the artifact migration ledger.

```typescript
import type { ArtifactStatements } from "../artifacts/ArtifactStatements";

export const postgresqlArtifactStatements: ArtifactStatements = Object.freeze({
  schema: Object.freeze([
    "CREATE TABLE IF NOT EXISTS kushibot_schema_versions (name TEXT PRIMARY KEY, version INTEGER NOT NULL CHECK (version > 0))",
    "CREATE TABLE IF NOT EXISTS kushibot_artifact_scopes (scope_id TEXT NOT NULL, project_id TEXT NOT NULL, revision BIGINT NOT NULL, PRIMARY KEY(scope_id, project_id))",
    "CREATE TABLE IF NOT EXISTS kushibot_artifacts (\nscope_id TEXT NOT NULL, project_id TEXT NOT NULL, artifact_id TEXT NOT NULL,\nproducer_operation_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, byte_length BIGINT NOT NULL CHECK(byte_length >= 0), metadata TEXT NOT NULL,\nPRIMARY KEY(scope_id, project_id, artifact_id), UNIQUE(scope_id, project_id, producer_operation_id, idempotency_key))",
    "CREATE TABLE IF NOT EXISTS kushibot_artifact_chunks (\nscope_id TEXT NOT NULL, project_id TEXT NOT NULL, artifact_id TEXT NOT NULL, chunk_index INTEGER NOT NULL CHECK(chunk_index >= 0), content TEXT NOT NULL,\nPRIMARY KEY(scope_id, project_id, artifact_id, chunk_index))",
    "CREATE TABLE IF NOT EXISTS kushibot_artifact_pins (\nscope_id TEXT NOT NULL, project_id TEXT NOT NULL, artifact_id TEXT NOT NULL, pin_id TEXT NOT NULL,\nPRIMARY KEY(scope_id, project_id, artifact_id, pin_id))",
  ]),
  readVersion: "SELECT version FROM kushibot_schema_versions WHERE name = 'artifacts'",
  installVersion: "INSERT INTO kushibot_schema_versions(name, version) VALUES('artifacts', 1)",
  ensureScope: "INSERT INTO kushibot_artifact_scopes(scope_id, project_id, revision) VALUES($1, $2, 0) ON CONFLICT(scope_id, project_id) DO NOTHING",
  lockScope: "UPDATE kushibot_artifact_scopes SET revision = revision + 1 WHERE scope_id = $1 AND project_id = $2",
  totals: "SELECT COUNT(*) AS object_count, COALESCE(SUM(byte_length), 0) AS byte_count FROM kushibot_artifacts WHERE scope_id = $1 AND project_id = $2",
  findOperation: "SELECT metadata FROM kushibot_artifacts WHERE scope_id = $1 AND project_id = $2 AND producer_operation_id = $3 AND idempotency_key = $4",
  load: "SELECT metadata FROM kushibot_artifacts WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3",
  insertMetadata: "INSERT INTO kushibot_artifacts(scope_id, project_id, artifact_id, producer_operation_id, idempotency_key, byte_length, metadata) VALUES($1,$2,$3,$4,$5,$6,$7)",
  insertChunk: "INSERT INTO kushibot_artifact_chunks(scope_id, project_id, artifact_id, chunk_index, content) VALUES($1,$2,$3,$4,$5)",
  readChunk: "SELECT content FROM kushibot_artifact_chunks WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3 AND chunk_index = $4",
  countPins: "SELECT COUNT(*) AS pin_count FROM kushibot_artifact_pins WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3",
  hasPin: "SELECT pin_id FROM kushibot_artifact_pins WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3 AND pin_id = $4",
  insertPin: "INSERT INTO kushibot_artifact_pins(scope_id, project_id, artifact_id, pin_id) VALUES($1,$2,$3,$4) ON CONFLICT(scope_id, project_id, artifact_id, pin_id) DO NOTHING",
  deletePin: "DELETE FROM kushibot_artifact_pins WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3 AND pin_id = $4",
  deleteChunks: "DELETE FROM kushibot_artifact_chunks WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3",
  deleteMetadata: "DELETE FROM kushibot_artifacts WHERE scope_id = $1 AND project_id = $2 AND artifact_id = $3",
});
```

### `persistence/artifacts/ArtifactSchema.ts`

Initializes the artifact namespace under the database binding’s migration lock and rejects incompatible schema versions.

```typescript
import type { ISqlDatabase } from "../sql/ISqlDatabase";
import type { ArtifactStatements } from "./ArtifactStatements";
import { PersistenceError } from "../../errors/PersistenceError";

export class ArtifactSchema {
  constructor(private readonly database: ISqlDatabase, private readonly sql: ArtifactStatements) {}
  async initialize(): Promise<void> {
    await this.database.migrationTransaction(async transaction => {
      await transaction.query(this.sql.schema[0], []);
      const current = await transaction.query(this.sql.readVersion, []);
      if (current.rows.length === 1 && current.rows[0].version === 1) return;
      if (current.rows.length !== 0) throw new PersistenceError("Unsupported artifact schema version.");
      for (const ddl of this.sql.schema.slice(1)) await transaction.query(ddl, []);
      await transaction.query(this.sql.installVersion, []);
    });
  }
}
```

### `persistence/artifacts/SqlArtifactStorageAdapter.ts`

Stores ready metadata, chunks, and producer pins atomically, and serializes per-scope quota and retention changes.

```typescript
import type { IArtifactStorageAdapter } from "../../artifacts/IArtifactStorageAdapter";
import type { ArtifactMetadata } from "../../artifacts/ArtifactMetadata";
import type { ArtifactAvailability } from "../../artifacts/ArtifactAvailability";
import type { ArtifactLimits } from "../../artifacts/ArtifactLimits";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import type { IRecordCodec } from "../../contracts/persistence/IRecordCodec";
import type { ISqlDatabase } from "../sql/ISqlDatabase";
import type { ISqlExecutor } from "../sql/ISqlExecutor";
import type { ArtifactStatements } from "./ArtifactStatements";
import { ArtifactError } from "../../errors/ArtifactError";
import { InvalidPersistenceRecordError } from "../../errors/InvalidPersistenceRecordError";

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
```

### `artifacts/ArtifactCaptureDecision.ts`

Expresses an explicit capture-policy acceptance or rejection without writing content.

```typescript
export type ArtifactCaptureDecision = Readonly<{ allowed: true }> | Readonly<{ allowed: false; reason: string }>;
```

### `artifacts/AllowListedArtifactCapturePolicy.ts`

Provides a basic media-type capture rule for controlled examples; it is not a secret detector or sanitizer.

```typescript
import type { IPolicy } from "../contracts/IPolicy";
import type { ArtifactWriteRequest } from "./ArtifactWriteRequest";
import type { ArtifactCaptureDecision } from "./ArtifactCaptureDecision";

export class AllowListedArtifactCapturePolicy implements IPolicy<ArtifactWriteRequest, ArtifactCaptureDecision> {
  private readonly allowed: ReadonlySet<string>;
  constructor(mediaTypes: readonly string[]) { this.allowed = new Set(mediaTypes); }
  async apply(input: ArtifactWriteRequest): Promise<ArtifactCaptureDecision> {
    return this.allowed.has(input.mediaType)
      ? { allowed: true }
      : { allowed: false, reason: "Media type is not permitted for capture." };
  }
}
```

### `artifacts/validateArtifactLimits.ts`

Validates and snapshots shared artifact bounds before factories create services.

```typescript
import type { ArtifactLimits } from "./ArtifactLimits";
import { ConfigurationError } from "../errors/ConfigurationError";

export function validateArtifactLimits(limits: ArtifactLimits): ArtifactLimits {
  const fields: readonly (keyof ArtifactLimits)[] = ["maxArtifactBytes", "maxArtifacts", "maxStoredBytes",
    "chunkBytes", "maxPageBytes", "maxPageLines", "maxSearchScanBytes", "maxSearchMatches",
    "maxPinsPerArtifact", "maxCursors", "cursorTtlMs"];
  if (fields.some(key => !Number.isSafeInteger(limits[key]) || limits[key] < 1) ||
      limits.chunkBytes > limits.maxArtifactBytes || limits.maxPageBytes > limits.maxArtifactBytes ||
      limits.maxSearchScanBytes > limits.maxArtifactBytes || limits.maxStoredBytes < limits.maxArtifactBytes) {
    throw new ConfigurationError("Invalid artifact limits.");
  }
  return Object.freeze({ ...limits });
}
```

### `artifacts/ScopedArtifactStore.ts`

Enforces bounded capture and reads, immutable reference matching, producer idempotency, expiration, and cryptographic integrity.

```typescript
import type { IArtifactStore } from "./IArtifactStore";
import type { IArtifactRangeReader } from "./IArtifactRangeReader";
import type { IArtifactStorageAdapter } from "./IArtifactStorageAdapter";
import type { IArtifactDigest } from "./IArtifactDigest";
import type { ArtifactRef } from "./ArtifactRef";
import type { ArtifactMetadata } from "./ArtifactMetadata";
import type { ArtifactWriteRequest } from "./ArtifactWriteRequest";
import type { ArtifactDocument } from "./ArtifactDocument";
import type { ArtifactSlice } from "./ArtifactSlice";
import type { ArtifactLimits } from "./ArtifactLimits";
import type { ArtifactCaptureDecision } from "./ArtifactCaptureDecision";
import type { IPolicy } from "../contracts/IPolicy";
import type { IClock } from "../contracts/runtime/IClock";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import type { ExecutionIdentity } from "../contracts/runtime/ExecutionIdentity";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import { ExecutionIdentityContract } from "../contracts/runtime/ExecutionIdentityContract";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { Base64ArtifactEncoding } from "../persistence/artifacts/Base64ArtifactEncoding";
import { validateArtifactLimits } from "./validateArtifactLimits";
import { ArtifactError } from "../errors/ArtifactError";

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
```

### `artifacts/TextArtifactReader.ts`

Pages and searches UTF-8 plain text through verified bounded slices, preserving line boundaries and explicit coverage.

```typescript
import type { IArtifactPagedReader } from "./IArtifactPagedReader";
import type { IArtifactSearchReader } from "./IArtifactSearchReader";
import type { IArtifactRangeReader } from "./IArtifactRangeReader";
import type { IArtifactCursorStore } from "./IArtifactCursorStore";
import type { ArtifactPageRequest } from "./ArtifactPageRequest";
import type { ArtifactPage } from "./ArtifactPage";
import type { ArtifactSearchRequest } from "./ArtifactSearchRequest";
import type { ArtifactSearchResult } from "./ArtifactSearchResult";
import type { ArtifactRef } from "./ArtifactRef";
import type { ArtifactCursorState } from "./ArtifactCursorState";
import type { ArtifactLimits } from "./ArtifactLimits";
import { validateArtifactLimits } from "./validateArtifactLimits";
import { ArtifactError } from "../errors/ArtifactError";

export class TextArtifactReader implements IArtifactPagedReader, IArtifactSearchReader {
  private readonly limits: ArtifactLimits;
  constructor(private readonly reader: IArtifactRangeReader, private readonly cursors: IArtifactCursorStore, limits: ArtifactLimits) {
    this.limits = validateArtifactLimits(limits);
  }

  async readPage(request: ArtifactPageRequest, signal?: AbortSignal): Promise<ArtifactPage> {
    this.bound(request.maxLines, this.limits.maxPageLines);
    this.bound(request.maxBytes, this.limits.maxPageBytes);
    const state = this.position(request.reference, "page", "", request.cursor);
    const page = await this.collect(request.reference, state, request.maxBytes, request.maxLines,
      this.limits.maxSearchScanBytes, signal);
    return { ...page, nextCursor: page.done ? null : this.cursors.put({ ...state,
      offset: page.range.endByteExclusive, nextLine: state.nextLine + this.lineCount(page.content) }) };
  }

  async search(request: ArtifactSearchRequest, signal?: AbortSignal): Promise<ArtifactSearchResult> {
    this.bound(request.maxMatches, this.limits.maxSearchMatches);
    this.bound(request.maxBytes, this.limits.maxPageBytes);
    this.bound(request.maxScanBytes, this.limits.maxSearchScanBytes);
    if (!request.query || new TextEncoder().encode(request.query).byteLength > this.limits.maxPageBytes) {
      throw new ArtifactError("ARTIFACT_LIMIT", "Search query is empty or too large.");
    }
    const state = this.position(request.reference, "search", request.query, request.cursor);
    // Read at most one bounded page per search call; continuation reports unsearched material.
    const page = await this.collect(request.reference, state, Math.min(this.limits.maxPageBytes, request.maxScanBytes),
      this.limits.maxPageLines, request.maxScanBytes, signal);
    const matches: Array<Readonly<{ line: number; startByte: number; endByteExclusive: number; content: string }>> = [];
    const lines = page.content.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    let offset = state.offset;
    let lineNumber = state.nextLine;
    let returnedBytes = 0;
    for (const line of lines) {
      const bytes = new TextEncoder().encode(line).byteLength;
      if (line.includes(request.query)) {
        if (matches.length === request.maxMatches || returnedBytes + bytes > request.maxBytes) {
          if (matches.length === 0) throw new ArtifactError("ARTIFACT_LIMIT", "A matching line exceeds the result bound.");
          break;
        }
        matches.push({ line: lineNumber, startByte: offset, endByteExclusive: offset + bytes, content: line });
        returnedBytes += bytes;
      }
      offset += bytes;
      lineNumber += 1;
    }
    const done = page.done && offset === page.range.endByteExclusive;
    return { reference: page.reference, matches, scannedBytes: page.scannedBytes, done,
      nextCursor: done ? null : this.cursors.put({ ...state, offset, nextLine: lineNumber }) };
  }

  private async collect(reference: ArtifactRef, state: ArtifactCursorState, maxBytes: number,
    maxLines: number, maxScannedBytes: number, signal?: AbortSignal): Promise<ArtifactPage> {
    const metadata = await this.reader.info(reference, signal);
    if (metadata.ref.mediaType !== "text/plain") throw new ArtifactError("ARTIFACT_UNSUPPORTED", "This reader supports UTF-8 text/plain only.");
    const slice = await this.reader.readSlice(reference, state.offset, maxBytes, maxScannedBytes, signal);
    let end = 0;
    let lines = 0;
    for (let index = 0; index < slice.data.length; index += 1) {
      if (slice.data[index] === 10) {
        end = index + 1;
        lines += 1;
        if (lines === maxLines) break;
      }
    }
    const atEnd = state.offset + slice.data.length === reference.byteLength;
    if (atEnd && lines < maxLines && end < slice.data.length) { end = slice.data.length; lines += 1; }
    if (end === 0 && slice.data.length > 0) throw new ArtifactError("ARTIFACT_LIMIT", "A text line exceeds the page bound.");
    let content: string;
    try { content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(slice.data.subarray(0, end)); }
    catch (error: unknown) {
      if (!(error instanceof TypeError)) throw error;
      throw new ArtifactError("ARTIFACT_CORRUPT", "Artifact is not valid UTF-8 text.");
    }
    const endByte = state.offset + end;
    return { reference: metadata.ref, content,
      range: { firstLine: lines === 0 ? null : state.nextLine, lastLine: lines === 0 ? null : state.nextLine + lines - 1,
        startByte: state.offset, endByteExclusive: endByte },
      scannedBytes: slice.scannedBytes, done: endByte === reference.byteLength, nextCursor: null };
  }

  private position(reference: ArtifactRef, mode: "page" | "search", query: string, token?: string): ArtifactCursorState {
    if (token === undefined) return { artifactId: reference.artifactId, digest: reference.digest, mode, query, offset: 0, nextLine: 1 };
    const state = this.cursors.get(token);
    if (state.artifactId !== reference.artifactId || state.digest !== reference.digest || state.mode !== mode || state.query !== query) {
      throw new ArtifactError("ARTIFACT_CURSOR_INVALID", "Cursor does not match this immutable query.");
    }
    return state;
  }
  private lineCount(content: string): number { return (content.match(/[^\n]*\n|[^\n]+$/g) ?? []).length; }
  private bound(value: number, cap: number): void {
    if (!Number.isSafeInteger(value) || value < 1 || value > cap) throw new ArtifactError("ARTIFACT_LIMIT", "Requested bound exceeds permitted capacity.");
  }
}
```

### `artifacts/ArtifactRetentionService.ts`

Exposes trusted pin management and expired-unpinned deletion separately from model-visible read/write capabilities.

```typescript
import type { IArtifactStorageAdapter } from "./IArtifactStorageAdapter";
import type { IClock } from "../contracts/runtime/IClock";

export class ArtifactRetentionService {
  constructor(private readonly storage: IArtifactStorageAdapter, private readonly clock: IClock, private readonly maxPins: number) {}
  pin(artifactId: string, pinId: string): Promise<void> { return this.storage.pin(artifactId, pinId, this.clock.nowEpochMs(), this.maxPins); }
  unpin(artifactId: string, pinId: string): Promise<void> { return this.storage.unpin(artifactId, pinId); }
  deleteExpired(artifactId: string): Promise<boolean> { return this.storage.deleteExpired(artifactId, this.clock.nowEpochMs()); }
}
```

### `artifacts/ArtifactServices.ts`

Groups the scoped artifact service, narrow text readers, trusted retention operations, and explicit schema initializer.

```typescript
import type { IArtifactStore } from "./IArtifactStore";
import type { IArtifactPagedReader } from "./IArtifactPagedReader";
import type { IArtifactSearchReader } from "./IArtifactSearchReader";
import type { ArtifactRetentionService } from "./ArtifactRetentionService";
import type { ArtifactSchema } from "../persistence/artifacts/ArtifactSchema";

export type ArtifactServices = Readonly<{
  store: IArtifactStore;
  pages: IArtifactPagedReader;
  search: IArtifactSearchReader;
  retention: ArtifactRetentionService;
  schema: ArtifactSchema;
}>;
```

### `artifacts/ArtifactStoreFactory.ts`

Assembles one scope-bound SQL artifact service from injected database, crypto, capture, identity, time, and limit collaborators.

```typescript
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase";
import type { ArtifactStatements } from "../persistence/artifacts/ArtifactStatements";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import type { ExecutionIdentity } from "../contracts/runtime/ExecutionIdentity";
import type { IClock } from "../contracts/runtime/IClock";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import type { IPolicy } from "../contracts/IPolicy";
import type { IArtifactDigest } from "./IArtifactDigest";
import type { ArtifactLimits } from "./ArtifactLimits";
import type { ArtifactServices } from "./ArtifactServices";
import type { ArtifactWriteRequest } from "./ArtifactWriteRequest";
import type { ArtifactCaptureDecision } from "./ArtifactCaptureDecision";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { JsonRecordCodec } from "../persistence/JsonRecordCodec";
import { ExecutionIdentityContract } from "../contracts/runtime/ExecutionIdentityContract";
import { ArtifactMetadataContract } from "./ArtifactMetadataContract";
import { ArtifactSchema } from "../persistence/artifacts/ArtifactSchema";
import { SqlArtifactStorageAdapter } from "../persistence/artifacts/SqlArtifactStorageAdapter";
import { Base64ArtifactEncoding } from "../persistence/artifacts/Base64ArtifactEncoding";
import { ScopedArtifactStore } from "./ScopedArtifactStore";
import { ArtifactCursorStore } from "./ArtifactCursorStore";
import { TextArtifactReader } from "./TextArtifactReader";
import { ArtifactRetentionService } from "./ArtifactRetentionService";
import { validateArtifactLimits } from "./validateArtifactLimits";

export class ArtifactStoreFactory {
  private readonly limits: ArtifactLimits;
  private readonly scope: ExecutionScopeRef;
  constructor(private readonly database: ISqlDatabase, private readonly statements: ArtifactStatements,
    scope: ExecutionScopeRef, limits: ArtifactLimits, private readonly digest: IArtifactDigest,
    private readonly clock: IClock, private readonly ids: IIdGenerator,
    private readonly capture: IPolicy<ArtifactWriteRequest, ArtifactCaptureDecision>, private readonly metadataMaxBytes: number) {
    this.scope = Object.freeze({ ...scope });
    this.limits = validateArtifactLimits(limits);
  }
  create(producer: ExecutionIdentity): ArtifactServices {
    const json = new JsonValueContract();
    const identities = new ExecutionIdentityContract();
    const codec = new JsonRecordCodec(new ArtifactMetadataContract(json, identities), json, this.metadataMaxBytes);
    const storage = new SqlArtifactStorageAdapter(this.database, this.statements, codec, this.scope);
    const store = new ScopedArtifactStore(storage, this.digest, new Base64ArtifactEncoding(), this.clock, this.ids,
      this.scope, producer, this.limits, this.capture, json, identities);
    const cursors = new ArtifactCursorStore(this.clock, this.ids, this.limits.maxCursors, this.limits.cursorTtlMs);
    const text = new TextArtifactReader(store, cursors, this.limits);
    return Object.freeze({ store, pages: text, search: text,
      retention: new ArtifactRetentionService(storage, this.clock, this.limits.maxPinsPerArtifact),
      schema: new ArtifactSchema(this.database, this.statements) });
  }
}
```

### `artifacts/ArtifactStoreDependencies.ts`

Lists explicit factory inputs for this artifact service; consumers still receive narrow capabilities rather than this construction bundle.

```typescript
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef";
import type { IClock } from "../contracts/runtime/IClock";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import type { IPolicy } from "../contracts/IPolicy";
import type { IArtifactDigest } from "./IArtifactDigest";
import type { ArtifactLimits } from "./ArtifactLimits";
import type { ArtifactWriteRequest } from "./ArtifactWriteRequest";
import type { ArtifactCaptureDecision } from "./ArtifactCaptureDecision";

export type ArtifactStoreDependencies = Readonly<{
  database: ISqlDatabase; scope: ExecutionScopeRef; limits: ArtifactLimits;
  digest: IArtifactDigest; clock: IClock; ids: IIdGenerator;
  capture: IPolicy<ArtifactWriteRequest, ArtifactCaptureDecision>; metadataMaxBytes: number;
}>;
```

### `persistence/sqlite/SqliteArtifactStoreFactory.ts`

Supplies the sqlite artifact SQL profile through composition without exposing SQL statements to application consumers.

```typescript
import type { ArtifactStoreDependencies } from "../../artifacts/ArtifactStoreDependencies";
import type { ExecutionIdentity } from "../../contracts/runtime/ExecutionIdentity";
import type { ArtifactServices } from "../../artifacts/ArtifactServices";
import { ArtifactStoreFactory } from "../../artifacts/ArtifactStoreFactory";
import { sqliteArtifactStatements } from "./sqliteArtifactStatements";

export class SqliteArtifactStoreFactory {
  private readonly factory: ArtifactStoreFactory;
  constructor(dependencies: ArtifactStoreDependencies) {
    const d = dependencies;
    this.factory = new ArtifactStoreFactory(d.database, sqliteArtifactStatements, d.scope, d.limits,
      d.digest, d.clock, d.ids, d.capture, d.metadataMaxBytes);
  }
  create(producer: ExecutionIdentity): ArtifactServices { return this.factory.create(producer); }
}
```

### `persistence/postgresql/PostgresqlArtifactStoreFactory.ts`

Supplies the postgresql artifact SQL profile through composition without exposing SQL statements to application consumers.

```typescript
import type { ArtifactStoreDependencies } from "../../artifacts/ArtifactStoreDependencies";
import type { ExecutionIdentity } from "../../contracts/runtime/ExecutionIdentity";
import type { ArtifactServices } from "../../artifacts/ArtifactServices";
import { ArtifactStoreFactory } from "../../artifacts/ArtifactStoreFactory";
import { postgresqlArtifactStatements } from "./postgresqlArtifactStatements";

export class PostgresqlArtifactStoreFactory {
  private readonly factory: ArtifactStoreFactory;
  constructor(dependencies: ArtifactStoreDependencies) {
    const d = dependencies;
    this.factory = new ArtifactStoreFactory(d.database, postgresqlArtifactStatements, d.scope, d.limits,
      d.digest, d.clock, d.ids, d.capture, d.metadataMaxBytes);
  }
  create(producer: ExecutionIdentity): ArtifactServices { return this.factory.create(producer); }
}
```

### `tests/fakes/MutableArtifactClock.ts`

Provides controlled time advancement for expiry and cursor tests.

```typescript
import type { IClock } from "../../contracts/runtime/IClock";

export class MutableArtifactClock implements IClock {
  constructor(private epochMs: number) {}
  nowEpochMs(): number { return this.epochMs; }
  advance(milliseconds: number): void {
    if (!Number.isSafeInteger(milliseconds) || milliseconds < 0 || !Number.isSafeInteger(this.epochMs + milliseconds)) {
      throw new Error("Invalid fixture time advance.");
    }
    this.epochMs += milliseconds;
  }
}
```

### `tests/fixtures/artifactFixtureLimits.ts`

Defines small deterministic test bounds, not production recommendations.

```typescript
import type { ArtifactLimits } from "../../artifacts/ArtifactLimits";

export const artifactFixtureLimits: ArtifactLimits = Object.freeze({
  maxArtifactBytes: 4096, maxArtifacts: 8, maxStoredBytes: 32768,
  chunkBytes: 32, maxPageBytes: 64, maxPageLines: 2, maxSearchScanBytes: 128,
  maxSearchMatches: 3, maxPinsPerArtifact: 8, maxCursors: 128, cursorTtlMs: 1000,
});
```

### `tests/artifacts/IArtifactTestHarness.ts`

Lets the shared tests open producer-scoped services, reopen the same real store, and inject controlled stored-chunk corruption.

```typescript
import type { ArtifactServices } from "../../artifacts/ArtifactServices";
import type { ArtifactLimits } from "../../artifacts/ArtifactLimits";
import type { IClock } from "../../contracts/runtime/IClock";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import type { ExecutionIdentity } from "../../contracts/runtime/ExecutionIdentity";

export interface IArtifactTestHarness {
  open(scope: ExecutionScopeRef, producer: ExecutionIdentity, limits: ArtifactLimits, clock: IClock): Promise<ArtifactServices>;
  corruptChunk(scope: ExecutionScopeRef, artifactId: string): Promise<void>;
  close(): Promise<void>;
}
```

### `tests/artifacts/ArtifactStore.test.ts`

Checks durable idempotent capture, conflicting content, scope isolation, full-read bounds, binary content, and chunk corruption.

```typescript
import type { IArtifactTestHarness } from "./IArtifactTestHarness";
import type { ArtifactWriteRequest } from "../../artifacts/ArtifactWriteRequest";
import { artifactFixtureLimits } from "../fixtures/artifactFixtureLimits";
import { MutableArtifactClock } from "../fakes/MutableArtifactClock";
import { ArtifactError } from "../../errors/ArtifactError";

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
```

### `tests/artifacts/ArtifactTextReader.test.ts`

Checks UTF-8 line paging, query-bound cursors, partial search coverage, oversized lines, and cancellation.

```typescript
import type { IArtifactTestHarness } from "./IArtifactTestHarness";
import { artifactFixtureLimits } from "../fixtures/artifactFixtureLimits";
import { MutableArtifactClock } from "../fakes/MutableArtifactClock";
import { ArtifactError } from "../../errors/ArtifactError";

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
```

### `tests/artifacts/ArtifactRetention.test.ts`

Checks producer-pin protection across restart, explicit handoff pins, expiration, and bounded cursor expiry.

```typescript
import type { IArtifactTestHarness } from "./IArtifactTestHarness";
import { artifactFixtureLimits } from "../fixtures/artifactFixtureLimits";
import { MutableArtifactClock } from "../fakes/MutableArtifactClock";
import { ArtifactError } from "../../errors/ArtifactError";

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
```

### `tests/artifacts/ArtifactQuota.test.ts`

Races two writers against a one-object scope quota to verify atomic admission on the actual backend.

```typescript
import type { IArtifactTestHarness } from "./IArtifactTestHarness";
import { artifactFixtureLimits } from "../fixtures/artifactFixtureLimits";
import { MutableArtifactClock } from "../fakes/MutableArtifactClock";
import { ArtifactError } from "../../errors/ArtifactError";

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
```

### `examples/artifacts/main.ts`

Saves a source-bound report and demonstrates complete, paged, and searched reads through a supplied SQLite binding.

```typescript
import type { ISqlDatabase, IClock, ArtifactLimits } from "../../index";
import {
  SqliteArtifactStoreFactory, Sha256ArtifactDigest, CryptoArtifactIdGenerator, AllowListedArtifactCapturePolicy,
} from "../../index";

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
```

### `index.ts`

Adds artifact capabilities and backend factories without replacing exports from earlier phases.

```typescript
export type { ArtifactRef } from "./artifacts/ArtifactRef";
export type { ArtifactLimits } from "./artifacts/ArtifactLimits";
export type { ArtifactWriteRequest } from "./artifacts/ArtifactWriteRequest";
export type { ArtifactMetadata } from "./artifacts/ArtifactMetadata";
export type { ArtifactDocument } from "./artifacts/ArtifactDocument";
export type { ArtifactSlice } from "./artifacts/ArtifactSlice";
export type { ArtifactPageRequest } from "./artifacts/ArtifactPageRequest";
export type { ArtifactPage } from "./artifacts/ArtifactPage";
export type { ArtifactSearchRequest } from "./artifacts/ArtifactSearchRequest";
export type { ArtifactSearchResult } from "./artifacts/ArtifactSearchResult";
export type { ArtifactEvidenceRef } from "./artifacts/ArtifactEvidenceRef";
export type { IArtifactReader } from "./artifacts/IArtifactReader";
export type { IArtifactWriter } from "./artifacts/IArtifactWriter";
export type { IArtifactStore } from "./artifacts/IArtifactStore";
export type { IArtifactPagedReader } from "./artifacts/IArtifactPagedReader";
export type { IArtifactSearchReader } from "./artifacts/IArtifactSearchReader";
export type { IArtifactDigest } from "./artifacts/IArtifactDigest";
export type { IArtifactRangeReader } from "./artifacts/IArtifactRangeReader";
export type { IArtifactStorageAdapter } from "./artifacts/IArtifactStorageAdapter";
export type { ArtifactAvailability } from "./artifacts/ArtifactAvailability";
export type { ArtifactCaptureDecision } from "./artifacts/ArtifactCaptureDecision";
export type { ArtifactServices } from "./artifacts/ArtifactServices";
export type { ArtifactStoreDependencies } from "./artifacts/ArtifactStoreDependencies";
export type { ArtifactErrorCode } from "./errors/ArtifactErrorCode";
export { ArtifactError } from "./errors/ArtifactError";
export { Sha256ArtifactDigest } from "./artifacts/Sha256ArtifactDigest";
export { CryptoArtifactIdGenerator } from "./artifacts/CryptoArtifactIdGenerator";
export { AllowListedArtifactCapturePolicy } from "./artifacts/AllowListedArtifactCapturePolicy";
export { SqliteArtifactStoreFactory } from "./persistence/sqlite/SqliteArtifactStoreFactory";
export { PostgresqlArtifactStoreFactory } from "./persistence/postgresql/PostgresqlArtifactStoreFactory";
```

### `tests/contracts/ArtifactApi.compile.ts`

Checks public artifact references, capabilities, factory inputs, cryptographic adapters, and error exports.

```typescript
import type {
  ArtifactRef, ArtifactLimits, ArtifactWriteRequest, ArtifactMetadata, ArtifactDocument, ArtifactSlice,
  ArtifactPageRequest, ArtifactPage, ArtifactSearchRequest, ArtifactSearchResult, ArtifactEvidenceRef,
  IArtifactReader, IArtifactWriter, IArtifactStore, IArtifactPagedReader, IArtifactSearchReader,
  IArtifactDigest, IArtifactRangeReader, IArtifactStorageAdapter, ArtifactAvailability,
  ArtifactCaptureDecision, ArtifactServices, ArtifactStoreDependencies, ArtifactErrorCode,
} from "../../index";
import {
  ArtifactError, Sha256ArtifactDigest, CryptoArtifactIdGenerator, AllowListedArtifactCapturePolicy,
  SqliteArtifactStoreFactory, PostgresqlArtifactStoreFactory,
} from "../../index";

export type ArtifactApiFixture = Readonly<{
  ref: ArtifactRef; limits: ArtifactLimits; write: ArtifactWriteRequest; metadata: ArtifactMetadata;
  document: ArtifactDocument; slice: ArtifactSlice; pageRequest: ArtifactPageRequest; page: ArtifactPage;
  searchRequest: ArtifactSearchRequest; search: ArtifactSearchResult; evidence: ArtifactEvidenceRef;
  reader: IArtifactReader; writer: IArtifactWriter; store: IArtifactStore;
  pages: IArtifactPagedReader; searcher: IArtifactSearchReader; digest: IArtifactDigest;
  range: IArtifactRangeReader; storage: IArtifactStorageAdapter; availability: ArtifactAvailability;
  capture: ArtifactCaptureDecision; services: ArtifactServices; dependencies: ArtifactStoreDependencies;
  errorCode: ArtifactErrorCode; errorClass: typeof ArtifactError; digestClass: typeof Sha256ArtifactDigest;
  idsClass: typeof CryptoArtifactIdGenerator; policyClass: typeof AllowListedArtifactCapturePolicy;
  sqliteFactory: typeof SqliteArtifactStoreFactory; postgresqlFactory: typeof PostgresqlArtifactStoreFactory;
}>;
```
