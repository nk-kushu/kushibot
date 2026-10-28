import type { IArtifactReader } from "../artifacts/IArtifactReader.js";
import type { ArtifactRef } from "../artifacts/ArtifactRef.js";
import type { IArtifactDigest } from "../artifacts/IArtifactDigest.js";
import { PublicationError } from "../errors/PublicationError.js";

/** The exact text versions recorded by WorkspaceEvidence. */
export type WorkspaceChange = Readonly<{ path: string; before: string | null; after: string | null }>;

/** Reads and validates a change artifact before it is displayed or used in a proposal. */
export class WorkspaceChangeReader {
  constructor(private readonly artifacts: IArtifactReader, private readonly digest: IArtifactDigest) {}

  async read(reference: ArtifactRef, expectedPath: string, signal?: AbortSignal): Promise<WorkspaceChange> {
    if (reference.mediaType !== "application/json" || reference.schemaId !== "workspace-change" || reference.schemaVersion !== "1") throw new PublicationError();
    const document = await this.artifacts.read(reference, 1_048_576, signal);
    if (document.data.byteLength !== reference.byteLength || await this.digest.hash(document.data) !== reference.digest) throw new PublicationError();
    let value: unknown;
    try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(document.data)); }
    catch { throw new PublicationError(); }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new PublicationError();
    const change = value as Record<string, unknown>;
    if (Object.keys(change).length !== 3 || change.path !== expectedPath ||
        typeof change.path !== "string" || change.path.length > 240 ||
        !/^[A-Za-z0-9_.@/-]+$/.test(change.path) ||
        change.path.split("/").some(part => !part || part === "." || part === ".." || part.toLowerCase() === ".git") ||
        !(change.before === null || typeof change.before === "string") ||
        !(change.after === null || typeof change.after === "string") ||
        (change.before === null && change.after === null) || change.before === change.after ||
        (typeof change.before === "string" && Buffer.byteLength(change.before) > 65536) ||
        (typeof change.after === "string" && Buffer.byteLength(change.after) > 65536)) throw new PublicationError();
    return { path: change.path, before: change.before, after: change.after } as WorkspaceChange;
  }
}
