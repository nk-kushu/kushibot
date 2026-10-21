/** References a trusted effective scope; the reference itself grants no access. */
export type ExecutionScopeRef = Readonly<{
  scopeId: string;
  projectId: string;
  workspaceId?: string;
}>;
