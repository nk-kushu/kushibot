import type { WorkspaceFileSnapshot } from "./WorkspaceFileSnapshot.js";
export type WorkspaceReplaceResult = Readonly<{ applied: boolean; snapshot: WorkspaceFileSnapshot }>;
