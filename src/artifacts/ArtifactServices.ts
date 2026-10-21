import type { IArtifactStore } from "./IArtifactStore.js";
import type { IArtifactPagedReader } from "./IArtifactPagedReader.js";
import type { IArtifactSearchReader } from "./IArtifactSearchReader.js";
import type { ArtifactRetentionService } from "./ArtifactRetentionService.js";
import type { ArtifactSchema } from "../persistence/artifacts/ArtifactSchema.js";

export type ArtifactServices = Readonly<{
  store: IArtifactStore;
  pages: IArtifactPagedReader;
  search: IArtifactSearchReader;
  retention: ArtifactRetentionService;
  schema: ArtifactSchema;
}>;
