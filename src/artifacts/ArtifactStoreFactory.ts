import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase.js";
import type { ArtifactStatements } from "../persistence/artifacts/ArtifactStatements.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { ExecutionIdentity } from "../contracts/runtime/ExecutionIdentity.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { IPolicy } from "../contracts/IPolicy.js";
import type { IArtifactDigest } from "./IArtifactDigest.js";
import type { ArtifactLimits } from "./ArtifactLimits.js";
import type { ArtifactServices } from "./ArtifactServices.js";
import type { ArtifactWriteRequest } from "./ArtifactWriteRequest.js";
import type { ArtifactCaptureDecision } from "./ArtifactCaptureDecision.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { JsonRecordCodec } from "../persistence/JsonRecordCodec.js";
import { ExecutionIdentityContract } from "../contracts/runtime/ExecutionIdentityContract.js";
import { ArtifactMetadataContract } from "./ArtifactMetadataContract.js";
import { ArtifactSchema } from "../persistence/artifacts/ArtifactSchema.js";
import { SqlArtifactStorageAdapter } from "../persistence/artifacts/SqlArtifactStorageAdapter.js";
import { Base64ArtifactEncoding } from "../persistence/artifacts/Base64ArtifactEncoding.js";
import { ScopedArtifactStore } from "./ScopedArtifactStore.js";
import { ArtifactCursorStore } from "./ArtifactCursorStore.js";
import { TextArtifactReader } from "./TextArtifactReader.js";
import { ArtifactRetentionService } from "./ArtifactRetentionService.js";
import { validateArtifactLimits } from "./validateArtifactLimits.js";

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
