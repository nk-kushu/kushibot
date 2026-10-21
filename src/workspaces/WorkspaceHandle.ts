import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
export type WorkspaceHandle = Readonly<{ schemaVersion: 1; workspaceId: string; baselineRef: string; scope: ExecutionScopeRef; providerId: "sql-text" }>;
