import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import type { ISqlDatabase } from "../sql/ISqlDatabase.js";
import type { ISqlExecutor } from "../sql/ISqlExecutor.js";
import type { IFilesystemPublicationReceiptStore } from "../../publication/FilesystemPublicationTarget.js";
import type { PublicationReceipt } from "../../publication/PublicationReceipt.js";
import { PublicationError } from "../../errors/PublicationError.js";
import type { FilesystemReceiptStatements } from "./FilesystemReceiptStatements.js";

/** Durable, immutable receipts, isolated by scope, target, and operation. */
export class SqlFilesystemReceiptStore implements IFilesystemPublicationReceiptStore {
  private readonly key: readonly string[];
  constructor(private readonly db: ISqlDatabase, private readonly sql: FilesystemReceiptStatements, scope: ExecutionScopeRef, private readonly targetId: string) {
    const ids = [scope.scopeId, scope.projectId, ...(scope.workspaceId === undefined ? [] : [scope.workspaceId]), targetId];
    if (!ids.every(value => this.id(value))) throw new PublicationError();
    this.key = Object.freeze([scope.scopeId, scope.projectId, scope.workspaceId ?? "", targetId]);
  }

  async initialize(): Promise<void> {
    await this.db.migrationTransaction(async tx => { await tx.query(this.sql.schema, []); });
  }

  read(operationId: string): Promise<PublicationReceipt | null> {
    return this.load(this.db, operationId);
  }

  async write(receipt: PublicationReceipt): Promise<void> {
    const checked = this.validate(receipt);
    const payload = JSON.stringify(checked);
    await this.db.transaction(async tx => {
      await tx.query(this.sql.insert, [...this.key, checked.operationId, payload]);
      const saved = await this.load(tx, checked.operationId);
      if (!saved || JSON.stringify(saved) !== payload) throw new PublicationError();
    });
  }

  private async load(tx: ISqlExecutor, operationId: string): Promise<PublicationReceipt | null> {
    if (!this.id(operationId)) throw new PublicationError();
    const rows = (await tx.query(this.sql.read, [...this.key, operationId])).rows;
    if (rows.length === 0) return null;
    if (rows.length !== 1 || typeof rows[0]!.payload !== "string") throw new PublicationError();
    let raw: unknown;
    try { raw = JSON.parse(rows[0]!.payload); } catch { throw new PublicationError(); }
    const receipt = this.validate(raw);
    if (receipt.operationId !== operationId) throw new PublicationError();
    return receipt;
  }

  private validate(raw: unknown): PublicationReceipt {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new PublicationError();
    const r = raw as Record<string, unknown>;
    const keys = ["operationId", "proposalDigest", "targetId", "beforeRevision", "afterRevision", "receiptRef"];
    if (Object.keys(r).length !== keys.length || keys.some(key => !Object.hasOwn(r, key)) ||
        !this.id(r.operationId) || r.targetId !== this.targetId ||
        typeof r.proposalDigest !== "string" || !/^[a-f0-9]{64}$/.test(r.proposalDigest) ||
        ![r.beforeRevision, r.afterRevision, r.receiptRef].every(value => typeof value === "string" && value.trim().length > 0 && value.length <= 256) ||
        r.beforeRevision === r.afterRevision) throw new PublicationError();
    return { operationId: r.operationId, proposalDigest: r.proposalDigest, targetId: this.targetId,
      beforeRevision: r.beforeRevision as string, afterRevision: r.afterRevision as string, receiptRef: r.receiptRef as string };
  }

  private id(value: unknown): value is string {
    return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,128}$/.test(value);
  }
}
