import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  realpath,
  type FileHandle,
} from "node:fs/promises";
import path from "node:path";
import type { IArtifactReader } from "../artifacts/IArtifactReader.js";
import type { IArtifactDigest } from "../artifacts/IArtifactDigest.js";
import type { IClock } from "../contracts/runtime/IClock.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
import type { ChangeProposal } from "./ChangeProposal.js";
import type { IPublicationTarget } from "./IPublicationTarget.js";
import type { PublicationCommand } from "./PublicationCommand.js";
import type { PublicationEffectOutcome } from "./PublicationEffectOutcome.js";
import type { PublicationReceipt } from "./PublicationReceipt.js";

/** The host supplies durable receipt storage, scoped to the project and target. */
export interface IFilesystemPublicationReceiptStore {
  read(operationId: string): Promise<PublicationReceipt | null>;
  write(receipt: PublicationReceipt): Promise<void>;
}

type PreparedFile = Readonly<{
  path: string;
  beforeDigest: string | null;
  afterDigest: string;
  data: Uint8Array;
}>;

/** Applies text changes to a filesystem workspace. Check commands and concurrent writers are not sandboxed. */
export class FilesystemPublicationTarget implements IPublicationTarget {
  constructor(
    private readonly directory: string,
    private readonly targetId: string,
    private readonly artifacts: IArtifactReader,
    private readonly digest: IArtifactDigest,
    private readonly receipts: IFilesystemPublicationReceiptStore,
    private readonly clock: IClock,
  ) {}

  async apply(
    proposal: ChangeProposal,
    command: PublicationCommand,
    context: IExecutionContext,
  ): Promise<PublicationEffectOutcome> {
    if (
      proposal.targetId !== this.targetId ||
      proposal.digest !== command.proposalDigest
    )
      return { status: "not-applied", code: "EVIDENCE_CHANGED" };
    const prior = await this.reconcile(proposal, command, context);
    if (prior.status === "published") return prior;
    if (this.stopped(context))
      return { status: "not-applied", code: "CONTROL_STOP" };
    let files: PreparedFile[];
    let root: string;
    try {
      root = await realpath(this.directory);
      files = await this.prepare(proposal, context);
      for (const file of files)
        if ((await this.currentHash(root, file.path)) !== file.beforeDigest)
          return { status: "not-applied", code: "TARGET_CHANGED" };
    } catch {
      return { status: "not-applied", code: "EVIDENCE_CHANGED" };
    }
    if (this.stopped(context))
      return { status: "not-applied", code: "CONTROL_STOP" };
    let started = false;
    try {
      for (const file of files) {
        if (this.stopped(context))
          return started
            ? { status: "unknown" }
            : { status: "not-applied", code: "CONTROL_STOP" };
        if ((await this.currentHash(root, file.path)) !== file.beforeDigest)
          return started
            ? { status: "unknown" }
            : { status: "not-applied", code: "TARGET_CHANGED" };
        started = true;
        await this.write(root, file);
      }
      for (const file of files)
        if ((await this.currentHash(root, file.path)) !== file.afterDigest)
          return { status: "unknown" };
      const receipt: PublicationReceipt = {
        operationId: command.operationId,
        proposalDigest: proposal.digest,
        targetId: proposal.targetId,
        beforeRevision: proposal.targetRevision,
        afterRevision: `published:${proposal.digest}`,
        receiptRef: `filesystem:${command.operationId}`,
      };
      await this.receipts.write(receipt);
      return { status: "published", receipt };
    } catch {
      return { status: "unknown" };
    }
  }

  async reconcile(
    proposal: ChangeProposal,
    command: PublicationCommand,
    _context: IExecutionContext,
  ): Promise<PublicationEffectOutcome> {
    if (
      proposal.targetId !== this.targetId ||
      proposal.digest !== command.proposalDigest
    )
      return { status: "unknown" };
    const receipt = await this.receipts.read(command.operationId);
    if (
      receipt &&
      receipt.operationId === command.operationId &&
      receipt.proposalDigest === proposal.digest &&
      receipt.targetId === proposal.targetId &&
      receipt.beforeRevision === proposal.targetRevision
    )
      return { status: "published", receipt };
    return { status: "unknown" };
  }

  private async prepare(
    proposal: ChangeProposal,
    context: IExecutionContext,
  ): Promise<PreparedFile[]> {
    const files: PreparedFile[] = [];
    for (const change of proposal.changes) {
      this.validatePath(change.path);
      // The coding agent does not currently expose deletions.
      if (
        !change.after ||
        change.after.mediaType !== "text/plain" ||
        change.after.byteLength > 65536
      )
        throw new Error("Unsupported change.");
      const document = await this.artifacts.read(
        change.after,
        65536,
        context.signal,
      );
      if (
        document.data.byteLength !== change.after.byteLength ||
        (await this.digest.hash(document.data)) !== change.after.digest
      )
        throw new Error("Invalid change artifact.");
      new TextDecoder("utf-8", { fatal: true }).decode(document.data);
      files.push({
        path: change.path,
        beforeDigest: change.beforeDigest,
        afterDigest: change.after.digest,
        data: document.data,
      });
    }
    if (
      !files.length ||
      new Set(files.map((file) => file.path)).size !== files.length
    )
      throw new Error("Invalid change list.");
    return files;
  }

  private validatePath(file: string): void {
    if (
      !/^[A-Za-z0-9_.@/-]+$/.test(file) ||
      file.length > 240 ||
      file
        .split("/")
        .some(
          (part) =>
            !part ||
            part === "." ||
            part === ".." ||
            part.toLowerCase() === ".git",
        )
    )
      throw new Error("Invalid path.");
  }

  private async locate(
    root: string,
    file: string,
    createParents: boolean,
  ): Promise<string | null> {
    let current = root;
    const parts = file.split("/");
    for (const part of parts.slice(0, -1)) {
      current = path.join(current, part);
      try {
        const info = await lstat(current);
        if (!info.isDirectory() || info.isSymbolicLink())
          throw new Error("Invalid parent.");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        if (!createParents) return null;
        await mkdir(current);
      }
    }
    return path.join(current, parts.at(-1)!);
  }

  private async currentHash(
    root: string,
    file: string,
  ): Promise<string | null> {
    const destination = await this.locate(root, file, false);
    if (!destination) return null;
    let handle;
    try {
      handle = await open(
        destination,
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    try {
      return await this.handleHash(handle);
    } finally {
      await handle.close();
    }
  }

  private async write(root: string, file: PreparedFile): Promise<void> {
    const destination = (await this.locate(root, file.path, true))!;
    const flags =
      constants.O_RDWR |
      constants.O_NOFOLLOW |
      (file.beforeDigest === null ? constants.O_CREAT | constants.O_EXCL : 0);
    const handle = await open(destination, flags, 0o644);
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.nlink !== 1)
        throw new Error("Invalid target.");
      if (
        file.beforeDigest !== null &&
        (await this.handleHash(handle)) !== file.beforeDigest
      )
        throw new Error("Target changed.");
      const current = await lstat(destination);
      if (
        current.isSymbolicLink() ||
        current.ino !== info.ino ||
        current.dev !== info.dev
      )
        throw new Error("Target changed while opening.");
      await handle.truncate(0);
      await handle.writeFile(file.data);
      await handle.sync();
    } finally {
      await handle.close();
    }
  }

  private async handleHash(handle: FileHandle): Promise<string> {
    const info = await handle.stat();
    if (!info.isFile() || info.nlink !== 1 || info.size > 65536)
      throw new Error("Invalid file.");
    const data = Buffer.alloc(65537);
    let bytes = 0;
    while (bytes < data.byteLength) {
      const read = await handle.read(
        data,
        bytes,
        data.byteLength - bytes,
        bytes,
      );
      if (!read.bytesRead) break;
      bytes += read.bytesRead;
    }
    if (bytes > 65536) throw new Error("File too large.");
    return this.digest.hash(data.subarray(0, bytes));
  }

  private stopped(context: IExecutionContext): boolean {
    return (
      context.signal.aborted ||
      (context.deadlineEpochMs !== null &&
        this.clock.nowEpochMs() >= context.deadlineEpochMs)
    );
  }
}
