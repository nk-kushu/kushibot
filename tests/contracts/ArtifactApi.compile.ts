import type {
  ArtifactRef, ArtifactLimits, ArtifactWriteRequest, ArtifactMetadata, ArtifactDocument, ArtifactSlice,
  ArtifactPageRequest, ArtifactPage, ArtifactSearchRequest, ArtifactSearchResult, ArtifactEvidenceRef,
  IArtifactReader, IArtifactWriter, IArtifactStore, IArtifactPagedReader, IArtifactSearchReader,
  IArtifactDigest, IArtifactRangeReader, IArtifactStorageAdapter, ArtifactAvailability,
  ArtifactCaptureDecision, ArtifactServices, ArtifactStoreDependencies, ArtifactErrorCode,
} from "../../src/index.js";
import {
  ArtifactError, Sha256ArtifactDigest, CryptoArtifactIdGenerator, AllowListedArtifactCapturePolicy,
  SqliteArtifactStoreFactory, PostgresqlArtifactStoreFactory,
} from "../../src/index.js";

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
