import { randomUUID } from "node:crypto";
import type { ArtifactRef } from "../artifacts/ArtifactRef.js";
import { Sha256ArtifactDigest } from "../artifacts/Sha256ArtifactDigest.js";
import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import { PublicationError } from "../errors/PublicationError.js";
import { EditingResultContract } from "../executors/EditingResultContract.js";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { JsonRecordCodec } from "../persistence/JsonRecordCodec.js";
import { SqlPublicationStore } from "../persistence/publication/SqlPublicationStore.js";
import type { PublicationStatements } from "../persistence/publication/PublicationStatements.js";
import { postgresqlPublicationStatements } from "../persistence/publication/postgresqlPublicationStatements.js";
import { LocalWorkspaceArtifacts } from "../workspaces/LocalWorkspaceArtifacts.js";
import { ChangeProposalContract } from "./ChangeProposalContract.js";
import { ChangeProposalService } from "./ChangeProposalService.js";
import { PublicationRecordContract } from "./PublicationRecordContract.js";
import { WorkspaceChangeReader } from "./WorkspaceChangeReader.js";
import { WorkspaceProposalBuilder } from "./WorkspaceProposalBuilder.js";

export type LocalProposalInput = Readonly<{
  id: string;
  workspace: string;
  targetId: string;
  scope: ExecutionScopeRef;
  result: unknown;
  artifacts: Readonly<Record<string, ArtifactRef>>;
}>;

/** Prepares persisted proposals from completed local coding runs. The caller authenticates the run. */
export class LocalWorkspaceProposalService {
  constructor(
    private readonly db: ISqlDatabase,
    private readonly statements: PublicationStatements = postgresqlPublicationStatements,
    private readonly artifactDirectory?: string,
  ) {}

  async create(input: LocalProposalInput) {
    const json = new JsonValueContract();
    const result = await new EditingResultContract(json).validate(input.result);
    if (!result.valid || result.value.unresolved.length)
      throw new PublicationError();
    const digest = new Sha256ArtifactDigest(globalThis.crypto.subtle);
    const contract = new ChangeProposalContract(json, digest);
    const records = new PublicationRecordContract(json, contract);
    const store = new SqlPublicationStore(
      this.db,
      this.statements,
      new JsonRecordCodec(records, json, 131072),
      input.scope,
    );
    await store.initialize();
    const existing = await store.get(input.id);
    if (existing) return existing;
    const clock = { nowEpochMs: () => Date.now() };
    const local = await LocalWorkspaceArtifacts.open(
      input.workspace,
      this.artifactDirectory,
    );
    try {
      const proposals = new ChangeProposalService(
        store,
        json,
        digest,
        contract,
        clock,
      );
      const builder = new WorkspaceProposalBuilder(
        new WorkspaceChangeReader(local.services.store, digest),
        proposals,
        digest,
        local.services.store,
      );
      return await builder.create(
        {
          id: input.id,
          targetId: input.targetId,
          policy: { id: "coding-review", version: "1" },
          result: result.value,
          artifacts: input.artifacts,
        },
        {
          identity: { operationId: randomUUID() },
          scope: input.scope,
          signal: new AbortController().signal,
          deadlineEpochMs: null,
          reporter: { async progress() {} },
        },
      );
    } finally {
      await local.close();
    }
  }
  /** Reads the exact versions bound to an existing proposal, verifying both artifact hashes. */
  async review(input: LocalProposalInput) {
    const json = new JsonValueContract();
    const result = await new EditingResultContract(json).validate(input.result);
    if (!result.valid || result.value.unresolved.length)
      throw new PublicationError();
    const digest = new Sha256ArtifactDigest(globalThis.crypto.subtle);
    const contract = new ChangeProposalContract(json, digest);
    const store = new SqlPublicationStore(
      this.db,
      this.statements,
      new JsonRecordCodec(
        new PublicationRecordContract(json, contract),
        json,
        131072,
      ),
      input.scope,
    );
    await store.initialize();
    const record = await store.get(input.id);
    if (!record) return null;
    if (
      record.proposal.targetId !== input.targetId ||
      record.proposal.sourceSnapshotRef !== result.value.resultSnapshotRef ||
      record.proposal.changes.length !== result.value.changedPaths.length ||
      result.value.changeArtifactRefs.length !==
        result.value.changedPaths.length
    )
      throw new PublicationError();
    const local = await LocalWorkspaceArtifacts.open(
      input.workspace,
      this.artifactDirectory,
    );
    try {
      const reader = new WorkspaceChangeReader(local.services.store, digest);
      const changes = [];
      for (const [index, proposed] of record.proposal.changes.entries()) {
        const path = result.value.changedPaths[index];
        const key = result.value.changeArtifactRefs[index];
        if (!key || !path || path !== proposed.path)
          throw new PublicationError();
        const ref = input.artifacts[key];
        if (!ref || key !== `artifact:${ref.artifactId}`)
          throw new PublicationError();
        const change = await reader.read(ref, path);
        const beforeDigest =
          change.before === null
            ? null
            : await digest.hash(new TextEncoder().encode(change.before));
        const afterDigest =
          change.after === null
            ? null
            : await digest.hash(new TextEncoder().encode(change.after));
        if (
          beforeDigest !== proposed.beforeDigest ||
          afterDigest !== (proposed.after?.digest ?? null)
        )
          throw new PublicationError();
        if (proposed.after) {
          const content = await local.services.store.read(
            proposed.after,
            65536,
          );
          if (
            content.data.byteLength !== proposed.after.byteLength ||
            (await digest.hash(content.data)) !== proposed.after.digest
          )
            throw new PublicationError();
        }
        changes.push(change);
      }
      const status: "applied" | "not-applied" | "pending" | "ready" =
        record.effect?.status === "published"
          ? "applied"
          : record.effect?.status === "not-applied"
            ? "not-applied"
            : record.command
              ? "pending"
              : "ready";
      return {
        id: record.proposal.id,
        digest: record.proposal.digest,
        summary: record.proposal.summary,
        status,
        ...(record.effect?.status === "not-applied"
          ? { code: record.effect.code }
          : {}),
        changes,
      };
    } finally {
      await local.close();
    }
  }
}
