import type { ArtifactRef } from "../artifacts/ArtifactRef.js";
import type { IArtifactWriter } from "../artifacts/IArtifactWriter.js";
import type { IArtifactDigest } from "../artifacts/IArtifactDigest.js";
import type { RegistrationRef } from "../contracts/RegistrationRef.js";
import type { EditingResult } from "../executors/EditingResult.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import { PublicationError } from "../errors/PublicationError.js";
import type { ChangeProposalService } from "./ChangeProposalService.js";
import type { PublicationRecord } from "./PublicationRecord.js";
import type { WorkspaceChangeReader } from "./WorkspaceChangeReader.js";

/** Builds a proposal from an editing result that the host has already verified. */
export class WorkspaceProposalBuilder {
  constructor(
    private readonly changes: WorkspaceChangeReader,
    private readonly proposals: ChangeProposalService,
    private readonly digest: IArtifactDigest,
    private readonly artifacts: IArtifactWriter,
  ) {}

  async create(
    input: Readonly<{
      id: string;
      targetId: string;
      policy: RegistrationRef;
      result: EditingResult;
      artifacts: Readonly<Record<string, ArtifactRef>>;
    }>,
    context: IExecutionContext,
  ): Promise<PublicationRecord> {
    const { result } = input;
    if (
      result.unresolved.length ||
      !result.changedPaths.length ||
      result.changedPaths.length > 32 ||
      result.changedPaths.length !== result.changeArtifactRefs.length ||
      new Set(result.changedPaths).size !== result.changedPaths.length ||
      new Set(result.changeArtifactRefs).size !==
        result.changeArtifactRefs.length
    )
      throw new PublicationError();
    const changes = [];
    for (const [index, path] of result.changedPaths.entries()) {
      const key = result.changeArtifactRefs[index]!;
      const ref = input.artifacts[key];
      if (!ref || key !== `artifact:${ref.artifactId}`)
        throw new PublicationError();
      const change = await this.changes.read(ref, path, context.signal);
      const beforeDigest =
        change.before === null
          ? null
          : await this.digest.hash(new TextEncoder().encode(change.before));
      const after =
        change.after === null
          ? null
          : await this.artifacts.write(
              {
                name: "publication-content",
                kind: "publication-content",
                mediaType: "text/plain",
                schemaId: null,
                schemaVersion: null,
                sourceRefs: [key],
                idempotencyKey: `publication:${input.id}:${await this.digest.hash(new TextEncoder().encode(path))}`,
                expiresAtEpochMs: null,
                data: new TextEncoder().encode(change.after),
              },
              context.signal,
            );
      changes.push({ path, beforeDigest, after });
    }
    const targetRevision = `baseline:${await this.digest.hash(new TextEncoder().encode(JSON.stringify(changes.map(({ path, beforeDigest }) => ({ path, beforeDigest })))))}`;
    return this.proposals.create(
      {
        id: input.id,
        scope: context.scope,
        summary: result.summary.slice(0, 1024),
        sourceSnapshotRef: result.resultSnapshotRef,
        targetId: input.targetId,
        targetRevision,
        policy: input.policy,
        changes,
      },
      context,
    );
  }
}
