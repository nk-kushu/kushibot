export type WorkspaceStatements = Readonly<{
  quota: string; schema: readonly string[]; createWorkspace: string; workspace: string; seed: string; read: string;
  acquire: string; release: string; assertOwner: string; insertFile: string; updateFile: string;
}>;
