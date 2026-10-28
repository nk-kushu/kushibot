import { createHash } from "node:crypto";
import type { ArtifactRef } from "../artifacts/ArtifactRef.js";
import type { IArtifactWriter } from "../artifacts/IArtifactWriter.js";
import type { JsonValue } from "../contracts/persistence/JsonValue.js";
import type { EditingResult } from "../executors/EditingResult.js";

/**
 * This is the coding agent’s change tracker and completion verifier.
 */

export class WorkspaceEvidence {
  private base = "";
  private readonly initial = new Map<string, string | null>();
  private readonly passed = new Map<string, string>();
  private readonly changeRefs = new Map<string, ArtifactRef>();

  constructor(
    private readonly readFile: (file: string) => Promise<string | null>,
    private readonly checks: readonly Readonly<{ id: string }>[],
    private readonly artifacts: IArtifactWriter,
    private readonly runId: string,
    private readonly signal: AbortSignal,
  ) {}

  async initialize(files: readonly string[]): Promise<void> {
    for (const file of files) this.initial.set(file, await this.readFile(file));
    this.base = await this.revision();
  }

  invalidateChecks(): void {
    this.passed.clear();
  }

  recordCheck(id: string, before: string, after: string, exitCode: number | null): void {
    if (exitCode === 0 && before === after) this.passed.set(id, after);
    else this.passed.delete(id);
  }

  async status(): Promise<EditingResult> {
    const revision = await this.revision();
    const changed: string[] = [];
    const refs: string[] = [];
    for (const file of this.initial.keys()) {
      const content = await this.readFile(file);
      if (content === this.initial.get(file)) continue;
      changed.push(file);
      const payload = JSON.stringify({
        path: file,
        before: this.initial.get(file) ?? null,
        after: content,
      });
      const key = this.hash(payload);
      let reference = this.changeRefs.get(key);
      if (!reference) {
        reference = await this.artifacts.write(
          {
            name: "workspace-change",
            kind: "workspace-change",
            mediaType: "application/json",
            schemaId: "workspace-change",
            schemaVersion: "1",
            sourceRefs: [this.base],
            idempotencyKey: `workspace-change:${this.runId}:${key}`,
            expiresAtEpochMs: null,
            data: new TextEncoder().encode(payload),
          },
          this.signal,
        );
        this.changeRefs.set(key, reference);
      }
      refs.push(`artifact:${reference.artifactId}`);
    }
    return {
      summary: "Workspace implementation result.",
      baseSnapshotRef: this.base,
      resultSnapshotRef: revision,
      changedPaths: changed,
      changeArtifactRefs: refs,
      unresolved: this.checks
        .filter((check) => this.passed.get(check.id) !== revision)
        .map((check) => `Required check has not passed on the current files: ${check.id}`),
    };
  }

  async accepts(candidate: EditingResult): Promise<boolean> {
    const actual = await this.status();
    return (
      candidate.unresolved.length === 0 &&
      actual.unresolved.length === 0 &&
      candidate.baseSnapshotRef === actual.baseSnapshotRef &&
      candidate.resultSnapshotRef === actual.resultSnapshotRef &&
      JSON.stringify(candidate.changedPaths) === JSON.stringify(actual.changedPaths) &&
      JSON.stringify(candidate.changeArtifactRefs) === JSON.stringify(actual.changeArtifactRefs)
    );
  }

  evidence(): Readonly<Record<string, JsonValue>> {
    return Object.fromEntries(
      [...this.changeRefs.values()].map((ref) => [`artifact:${ref.artifactId}`, { ...ref }]),
    );
  }

  track(file: string, content: string | null): void {
    if (!this.initial.has(file)) {
      this.initial.set(file, content);
      this.passed.clear();
    }
  }

  async revision(): Promise<string> {
    const values = await Promise.all(
      [...this.initial.keys()].sort().map(async (file) => [file, await this.readFile(file)]),
    );
    return `snapshot:${this.hash(JSON.stringify(values))}`;
  }
  hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
