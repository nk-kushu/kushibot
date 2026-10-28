/**
 * Per-run record of tool operations.
 *
 * Kushibot’s ToolDispatcher calls it to decide whether an
 * operation can execute, should return a saved result,
 * or must stop because its outcome is unknown.
 */

import { ToolOperationError } from "../../errors/ToolOperationError.js";
import type { IToolOperationJournal } from "./IToolOperationJournal.js";
import type { ToolOperationClaim } from "./ToolOperationClaim.js";
import type { ToolOperationClaimResult } from "./ToolOperationClaimResult.js";
import type { ToolObservation } from "../ToolObservation.js";

/** Per-run tool receipts. Completed calls replay; pending calls require reconciliation.
 * In-memory only: this local adapter does not provide process-restart recovery.
 */
export class InMemoryToolOperationJournal implements IToolOperationJournal {
  private readonly entries = new Map<
    string,
    { claim: ToolOperationClaim; observation: ToolObservation | null }
  >();

  /** Nothing to prepare: the notebook is already in RAM. Example: no database to open. */
  async initialize(): Promise<void> {}

  /**
   * Checks whether an operation can start or already has a record.
   * Example: "write-123" is new → allow it; finished → return its saved result;
   * still waiting for a result → return "pending". Reusing its ID for a different request fails.
   */
  async claim(command: ToolOperationClaim): Promise<ToolOperationClaimResult> {
    const entry = this.entries.get(command.operationId);
    if (!entry) {
      this.entries.set(command.operationId, { claim: { ...command }, observation: null });
      return { kind: "acquired" };
    }
    if (entry.claim.requestKey !== command.requestKey) throw new ToolOperationError();
    return entry.observation === null
      ? { kind: "pending" }
      : { kind: "completed", observation: structuredClone(entry.observation) };
  }

  /**
   * Saves the tool's result for later retries.
   * Example: save "file written" for "write-123", so a retry gets that same result.
   * Rejects a result for the wrong operation or a change to an already saved result.
   */
  async complete(command: ToolOperationClaim, observation: ToolObservation): Promise<void> {
    const entry = this.owned(command);
    if (
      observation.operationId !== command.operationId ||
      (entry.observation !== null &&
        JSON.stringify(entry.observation) !== JSON.stringify(observation))
    )
      throw new ToolOperationError();
    entry.observation = structuredClone(observation);
  }

  /**
   * Removes a reservation when the tool has not started, allowing another attempt.
   * Example: a write is blocked before it runs → remove "write-123" from the notebook.
   * A completed operation cannot be removed this way.
   */
  async releaseBeforeDispatch(command: ToolOperationClaim): Promise<void> {
    if (this.owned(command).observation !== null) throw new ToolOperationError();
    this.entries.delete(command.operationId);
  }

  /**
   * Finds a record and checks that this caller owns it and the request matches.
   * Example: caller A reserved "write-123" → caller B cannot save a result for it.
   * Throws an error if the record is missing or the details do not match.
   */
  private owned(command: ToolOperationClaim) {
    const entry = this.entries.get(command.operationId);
    if (
      !entry ||
      entry.claim.ownerToken !== command.ownerToken ||
      entry.claim.requestKey !== command.requestKey
    )
      throw new ToolOperationError();
    return entry;
  }
}
