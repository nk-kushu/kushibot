import type { IToolOperationJournal } from "../../src/tools/operations/IToolOperationJournal.js";
import type { ToolOperationClaim } from "../../src/tools/operations/ToolOperationClaim.js";
import type { ToolOperationClaimResult } from "../../src/tools/operations/ToolOperationClaimResult.js";
import type { ToolObservation } from "../../src/tools/ToolObservation.js";
import { ToolOperationError } from "../../src/errors/ToolOperationError.js";
export class MemoryToolOperationJournal implements IToolOperationJournal {
  private readonly entries = new Map<string, Readonly<{ claim: ToolOperationClaim; observation: ToolObservation | null }>>();
  async initialize(): Promise<void> {}
  async claim(command: ToolOperationClaim): Promise<ToolOperationClaimResult> {
    const old = this.entries.get(command.operationId);
    if (old === undefined) { this.entries.set(command.operationId, { claim: command, observation: null }); return { kind: "acquired" }; }
    if (old.claim.requestKey !== command.requestKey) throw new ToolOperationError();
    return old.observation === null ? { kind: "pending" } : { kind: "completed", observation: old.observation };
  }
  async complete(command: ToolOperationClaim, observation: ToolObservation): Promise<void> {
    const old = this.entries.get(command.operationId);
    if (old === undefined || old.claim.ownerToken !== command.ownerToken || old.claim.requestKey !== command.requestKey) throw new ToolOperationError();
    if (old.observation !== null && JSON.stringify(old.observation) !== JSON.stringify(observation)) throw new ToolOperationError();
    this.entries.set(command.operationId, { claim: command, observation });
  }
  async releaseBeforeDispatch(command: ToolOperationClaim): Promise<void> {
    const old = this.entries.get(command.operationId);
    if (old === undefined || old.claim.ownerToken !== command.ownerToken || old.claim.requestKey !== command.requestKey || old.observation !== null) throw new ToolOperationError();
    this.entries.delete(command.operationId);
  }
}
