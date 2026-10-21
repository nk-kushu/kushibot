import type { IWorkspaceFiles } from "./IWorkspaceFiles.js";
import type { WorkspaceReplaceResult } from "./WorkspaceReplaceResult.js";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard.js";
import { WorkspaceOperationError } from "../errors/WorkspaceOperationError.js";
export class WorkspaceEditSession {
  private active = true;
  private actions = 0;
  private readonly writes: Promise<WorkspaceReplaceResult>[] = [];
  constructor(private readonly files: IWorkspaceFiles, private readonly ownerToken: string, private readonly controls: ExecutionBoundaryGuard) {}
  async read(path: string) { this.check(); return this.files.read(path); }
  replace(path: string, expectedRevision: number | null, text: string | null): Promise<WorkspaceReplaceResult> {
    this.check();
    const write = this.files.replace(this.ownerToken, path, expectedRevision, text);
    this.writes.push(write); void write.catch(() => {});
    return write;
  }
  async closeAndDrain(): Promise<void> {
    this.active = false;
    const settled = await Promise.allSettled(this.writes);
    if (settled.some(result => result.status === "rejected")) throw new WorkspaceOperationError();
  }
  private check(): void {
    if (!this.active || this.actions >= 64 || this.controls.check() !== null) throw new WorkspaceOperationError();
    this.actions++;
  }
}
