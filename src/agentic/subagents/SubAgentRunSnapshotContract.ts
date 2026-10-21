import type { IResultContract } from "../../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../../contracts/validation/ValidationResult.js";
import type { SubAgentRunSnapshot } from "./SubAgentRunSnapshot.js";
import { JsonValueContract } from "../../persistence/JsonValueContract.js";
import { SubAgentRequestContract } from "./SubAgentRequestContract.js";
import { ChildOutcomeContract } from "./ChildOutcomeContract.js";
import { SubAgentState } from "./SubAgentState.js";
import { SubAgentCoordinationError } from "../../errors/SubAgentCoordinationError.js";
export class SubAgentRunSnapshotContract implements IResultContract<SubAgentRunSnapshot> {
  readonly id = "sub-agent-run-snapshot"; readonly version = "1";
  constructor(private readonly json: JsonValueContract, private readonly requests: SubAgentRequestContract, private readonly outcomes: ChildOutcomeContract) {}
  async validate(raw: unknown): Promise<ValidationResult<SubAgentRunSnapshot>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (!this.object(row) ||
        !this.keys(row,["schemaVersion","runId","rootSessionId","rootBudgetScopeId","scope","maxChildren","maxDepth","records"]) ||
        row.schemaVersion !== 1 ||
        !this.validId(row.runId) ||
        !this.validId(row.rootSessionId) ||
        !this.validId(row.rootBudgetScopeId) ||
        !this.scope(row.scope) ||
        !Number.isSafeInteger(row.maxChildren) ||
        !Number.isSafeInteger(row.maxDepth) ||
        !Array.isArray(row.records) ||
        row.records.length > 64) return this.invalid();
    for (const record of row.records) {
      if (!this.object(record) ||
        !this.keys(record,["claim","outcome"]) ||
        !this.object(record.claim) ||
        !this.keys(record.claim,["commandId","requestKey","candidate"]) ||
        !this.validId(record.claim.commandId) ||
        typeof record.claim.requestKey !== "string" ||
        record.claim.requestKey.length > 32768) return this.invalid();
      const child = record.claim.candidate;
      if (!this.object(child) ||
        !this.keys(child,["childId","sessionId","operationId","budgetScopeId","parentSessionId","parentChildId","parentBudgetScopeId","depth","runId","scope","request"]) ||
        ![child.childId,child.sessionId,child.operationId,child.budgetScopeId,child.parentSessionId,child.parentBudgetScopeId,child.runId].every(value => this.validId(value)) ||
        !(child.parentChildId === null ||
        this.validId(child.parentChildId)) ||
        !Number.isSafeInteger(child.depth) ||
        !this.scope(child.scope) ||
        !(await this.requests.validate(child.request)).valid ||
        (record.outcome !== null && !(await this.outcomes.validate(record.outcome)).valid)) return this.invalid();
    }
    try { const state = new SubAgentState(checked.value as unknown as SubAgentRunSnapshot); return { valid: true, value: state.snapshot() }; }
    catch (error) { if (!(error instanceof SubAgentCoordinationError)) throw error; return this.invalid(); }
  }
  private object(value: unknown): value is Record<string,unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string,unknown>, keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private validId(value: unknown): boolean { return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,128}$/.test(value); }
  private scope(value: unknown): boolean { return this.object(value) && (this.keys(value,["scopeId","projectId"]) || this.keys(value,["scopeId","projectId","workspaceId"])) && this.validId(value.scopeId) && this.validId(value.projectId) && (value.workspaceId === undefined || this.validId(value.workspaceId)); }
  private invalid(): ValidationResult<never> { return { valid: false, issues: [{ path: [], code: "INVALID_CHILD_JOURNAL", message: "Sub-agent journal does not satisfy its versioned contract." }] }; }
}
