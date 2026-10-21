import type { WorkspaceHandle } from "./WorkspaceHandle.js";
import type { WorkspaceSeedFile } from "./WorkspaceSeedFile.js";
export interface IWorkspaceProvider { create(workspaceId: string, baselineRef: string, files: readonly WorkspaceSeedFile[]): Promise<WorkspaceHandle>; }
