import type { WorkspaceFileSnapshot } from "./WorkspaceFileSnapshot.js";
import type { WorkspaceReplaceResult } from "./WorkspaceReplaceResult.js";
export interface IWorkspaceFiles {
  read(path: string, maxBytes?: number): Promise<WorkspaceFileSnapshot>;
  replace(ownerToken: string, path: string, expectedRevision: number | null, text: string | null): Promise<WorkspaceReplaceResult>;
}
