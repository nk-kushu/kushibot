import { randomUUID } from "node:crypto";
import { Sha256ArtifactDigest } from "../artifacts/Sha256ArtifactDigest.js";
import { PublicationError } from "../errors/PublicationError.js";
import type { ISqlDatabase } from "../persistence/sql/ISqlDatabase.js";
import { JsonRecordCodec } from "../persistence/JsonRecordCodec.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import type { PublicationStatements } from "../persistence/publication/PublicationStatements.js";
import type { FilesystemReceiptStatements } from "../persistence/publication/FilesystemReceiptStatements.js";
import { postgresqlPublicationStatements } from "../persistence/publication/postgresqlPublicationStatements.js";
import { postgresqlFilesystemReceiptStatements } from "../persistence/publication/postgresqlFilesystemReceiptStatements.js";
import { SqlPublicationStore } from "../persistence/publication/SqlPublicationStore.js";
import { SqlFilesystemReceiptStore } from "../persistence/publication/SqlFilesystemReceiptStore.js";
import { LocalWorkspaceArtifacts } from "../workspaces/LocalWorkspaceArtifacts.js";
import { ChangeProposalContract } from "./ChangeProposalContract.js";
import { PublicationRecordContract } from "./PublicationRecordContract.js";
import { PublicationCoordinator } from "./PublicationCoordinator.js";
import { FilesystemPublicationTarget } from "./FilesystemPublicationTarget.js";
import type {
  LocalProposalInput,
  LocalWorkspaceProposalService,
} from "./LocalWorkspaceProposalService.js";

/** Applies an explicit, authenticated approval to a previously reviewed proposal. */
export class LocalWorkspacePublicationService {
  constructor(
    private readonly db: ISqlDatabase,
    private readonly proposals: LocalWorkspaceProposalService,
    private readonly statements: PublicationStatements = postgresqlPublicationStatements,
    private readonly receiptStatements: FilesystemReceiptStatements = postgresqlFilesystemReceiptStatements,
    private readonly artifactDirectory?: string,
  ) {}

  async apply(
    input: LocalProposalInput,
    approvedDigest: string,
    principal: string,
  ) {
    return this.execute(input, approvedDigest, principal, false);
  }

  async reconcile(
    input: LocalProposalInput,
    approvedDigest: string,
    principal: string,
  ) {
    return this.execute(input, approvedDigest, principal, true);
  }

  private async execute(
    input: LocalProposalInput,
    approvedDigest: string,
    principal: string,
    reconcileOnly: boolean,
  ) {
    const review = await this.proposals.review(input);
    if (
      !review ||
      review.digest !== approvedDigest ||
      !principal.trim() ||
      principal.length > 200
    )
      throw new PublicationError();
    const json = new JsonValueContract();
    const digest = new Sha256ArtifactDigest(globalThis.crypto.subtle);
    const records = new PublicationRecordContract(
      json,
      new ChangeProposalContract(json, digest),
    );
    const store = new SqlPublicationStore(
      this.db,
      this.statements,
      new JsonRecordCodec(records, json, 131072),
      input.scope,
    );
    const receipts = new SqlFilesystemReceiptStore(
      this.db,
      this.receiptStatements,
      input.scope,
      input.targetId,
    );
    await store.initialize();
    await receipts.initialize();
    const local = await LocalWorkspaceArtifacts.open(
      input.workspace,
      this.artifactDirectory,
    );
    try {
      const clock = { nowEpochMs: () => Date.now() };
      const operationId = randomUUID();
      const context = {
        identity: { operationId },
        scope: input.scope,
        signal: new AbortController().signal,
        deadlineEpochMs: null,
        reporter: { async progress() {} },
      };
      const approvalRef = `approval:${operationId}`;
      const coordinator = new PublicationCoordinator(
        store,
        {
          async read(ref, proposal) {
            if (ref !== approvalRef || proposal.digest !== approvedDigest)
              return null;
            return {
              approvalId: operationId,
              principalRef: principal,
              receiptRef: approvalRef,
              decision: "approved" as const,
              scope: input.scope,
              proposalDigest: proposal.digest,
              targetId: proposal.targetId,
              targetRevision: proposal.targetRevision,
              expiresAtEpochMs: clock.nowEpochMs() + 60000,
            };
          },
        },
        {
          verify: async (proposal) => {
            const latest = await this.proposals.review(input);
            return (
              latest !== null &&
              latest.digest === proposal.digest &&
              latest.digest === approvedDigest
            );
          },
        },
        new FilesystemPublicationTarget(
          input.workspace,
          input.targetId,
          local.services.store,
          digest,
          receipts,
          clock,
        ),
        records,
        clock,
      );
      const current = await store.get(input.id);
      if (!current || current.proposal.digest !== approvedDigest)
        throw new PublicationError();
      if (reconcileOnly && !current.command)
        return { status: "waiting-for-approval" as const, effect: null };
      const outcome = current.command
        ? await coordinator.reconcile(input.id, context)
        : await coordinator.publish(
            input.id,
            approvalRef,
            {
              reviewRef: `review:${approvedDigest}`,
              verificationRef: `run:${input.id}`,
            },
            context,
          );
      return { status: outcome.status, effect: outcome.record.effect };
    } finally {
      await local.close();
    }
  }
}
