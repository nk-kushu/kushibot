import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";
import type { IPolicy } from "../contracts/IPolicy.js";
import type { IArtifactDigest } from "./IArtifactDigest.js";
import type { ArtifactLimits } from "./ArtifactLimits.js";
import type { ArtifactWriteRequest } from "./ArtifactWriteRequest.js";
import type { ArtifactCaptureDecision } from "./ArtifactCaptureDecision.js";

export type ArtifactStoreDependencies = Readonly<{
  database: ISqlDatabase; scope: ExecutionScopeRef; limits: ArtifactLimits;
  digest: IArtifactDigest; clock: IClock; ids: IIdGenerator;
  capture: IPolicy<ArtifactWriteRequest, ArtifactCaptureDecision>; metadataMaxBytes: number;
}>;
