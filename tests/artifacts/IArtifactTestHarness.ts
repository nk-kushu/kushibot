import type { ArtifactServices } from "../../src/artifacts/ArtifactServices.js";
import type { ArtifactLimits } from "../../src/artifacts/ArtifactLimits.js";
import type { IClock } from "../../src/contracts/runtime/IClock.js";
import type { ExecutionScopeRef } from "../../src/contracts/runtime/ExecutionScopeRef.js";
import type { ExecutionIdentity } from "../../src/contracts/runtime/ExecutionIdentity.js";

export interface IArtifactTestHarness {
  open(scope: ExecutionScopeRef, producer: ExecutionIdentity, limits: ArtifactLimits, clock: IClock): Promise<ArtifactServices>;
  corruptChunk(scope: ExecutionScopeRef, artifactId: string): Promise<void>;
  close(): Promise<void>;
}
