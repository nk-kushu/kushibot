export interface IWorkspaceEditGate { acquire(ownerToken: string): Promise<boolean>; release(ownerToken: string): Promise<void>; }
