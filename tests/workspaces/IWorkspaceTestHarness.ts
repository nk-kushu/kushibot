import type { IWorkspaceProvider } from "../../src/workspaces/IWorkspaceProvider.js";
import type { IWorkspaceFiles } from "../../src/workspaces/IWorkspaceFiles.js";
import type { IWorkspaceEditGate } from "../../src/workspaces/IWorkspaceEditGate.js";
import type { WorkspaceHandle } from "../../src/workspaces/WorkspaceHandle.js";
import type { WorkspaceBoundary } from "../../src/workspaces/WorkspaceBoundary.js";
export interface IWorkspaceTestHarness {
  provider(): Promise<IWorkspaceProvider>;
  files(handle: WorkspaceHandle, boundary: WorkspaceBoundary): IWorkspaceFiles;
  gate(handle: WorkspaceHandle): IWorkspaceEditGate;
  close(): Promise<void>;
}
