import type { IScopedSourceReader } from "../tools/source/IScopedSourceReader.js";
import type { IWorkspaceFiles } from "./IWorkspaceFiles.js";
import { WorkspaceOperationError } from "../errors/WorkspaceOperationError.js";
export class WorkspaceSourceReader implements IScopedSourceReader {
  private readonly references: ReadonlyMap<string, string>;
  constructor(private readonly files: IWorkspaceFiles, references: ReadonlyMap<string, string>) {
    if (references.size > 256 || [...references.keys()].some(ref => !/^source:[a-zA-Z0-9_.:/-]{1,128}$/.test(ref))) throw new WorkspaceOperationError();
    this.references = new Map(references);
  }
  async read(sourceRef: string, maxBytes: number, signal: AbortSignal): Promise<string> {
    if (signal.aborted || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 65536) throw new WorkspaceOperationError();
    const path = this.references.get(sourceRef); if (path === undefined) throw new WorkspaceOperationError();
    const file = await this.files.read(path, maxBytes);
    if (signal.aborted || file.text === null) throw new WorkspaceOperationError();
    return file.text;
  }
}
