import { WorkspaceOperationError } from "../errors/WorkspaceOperationError.js";
export class WorkspaceBoundary {
  private readonly readable: ReadonlySet<string>;
  private readonly writable: ReadonlySet<string>;
  constructor(readable: readonly string[], writable: readonly string[], readonly maxFileBytes: number) {
    if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes < 1 || maxFileBytes > 65536 || readable.length > 256 || writable.length > 256) throw new WorkspaceOperationError();
    for (const path of [...readable, ...writable]) this.validatePath(path);
    this.readable = new Set(readable); this.writable = new Set(writable);
  }
  validatePath(path: string): void {
    if (typeof path !== "string" || new TextEncoder().encode(path).byteLength > 256 || !/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(path) ||
        path.split("/").some(part => part === "." || part === ".." || part.toLowerCase() === ".git")) throw new WorkspaceOperationError();
  }
  requireRead(path: string): void { this.validatePath(path); if (!this.readable.has(path)) throw new WorkspaceOperationError(); }
  requireWrite(path: string): void { this.validatePath(path); if (!this.writable.has(path)) throw new WorkspaceOperationError(); }
  validateText(text: string): void { if (typeof text !== "string" || text.includes("\u0000") || /[\uD800-\uDFFF]/u.test(text) || new TextEncoder().encode(text).byteLength > this.maxFileBytes) throw new WorkspaceOperationError(); }
}
