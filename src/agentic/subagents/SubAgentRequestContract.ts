import type { IResultContract } from "../../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../../contracts/validation/ValidationResult.js";
import type { SubAgentRequest } from "./SubAgentRequest.js";
import { JsonValueContract } from "../../persistence/JsonValueContract.js";
import { usageDimensions } from "../../usage/usageDimensions.js";
export class SubAgentRequestContract implements IResultContract<SubAgentRequest> {
  readonly id = "sub-agent-request"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<SubAgentRequest>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 16384) return this.invalid();
    const row = checked.value as unknown as Record<string, unknown>;
    if (!this.object(row) ||
        !this.keys(row, ["goal","acceptanceCriteria","sourceRefs","modelRole","resultContractId","toolIds","access","filePaths","maxTurns","limits","deadlineEpochMs"])) return this.invalid();
    if (!this.text(row.goal, 2048) ||
        !this.list(row.acceptanceCriteria, 16, 512) ||
        (row.acceptanceCriteria as unknown[]).length < 1 ||
        !this.list(row.sourceRefs, 16, 256) ||
        !this.validId(row.modelRole) ||
        !this.validId(row.resultContractId) ||
        !this.list(row.toolIds, 16, 128) ||
        !(row.toolIds as unknown[]).every(value => this.validId(value)) ||
        !["read-only","edit"].includes(row.access as string) ||
        !this.list(row.filePaths, 16, 256) ||
        !(row.filePaths as string[]).every(path => this.path(path)) ||
        !Number.isSafeInteger(row.maxTurns) ||
        (row.maxTurns as number) < 1 ||
        (row.maxTurns as number) > 128 ||
        !this.object(row.limits) ||
        !this.keys(row.limits, usageDimensions) ||
        !usageDimensions.every(key => Number.isSafeInteger((row.limits as Record<string, unknown>)[key]) && ((row.limits as Record<string, number>)[key] >= 0) && ((row.limits as Record<string, number>)[key] <= 1000000000)) ||
        !(row.deadlineEpochMs === null ||
        (Number.isSafeInteger(row.deadlineEpochMs) && (row.deadlineEpochMs as number) >= 0))) return this.invalid();
    return { valid: true, value: checked.value as unknown as SubAgentRequest };
  }
  private object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private validId(value: unknown): boolean { return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,128}$/.test(value); }
  private text(value: unknown, max: number): boolean { return typeof value === "string" && value.trim().length > 0 && value.length <= max; }
  private list(value: unknown, max: number, length: number): boolean { return Array.isArray(value) && value.length <= max && value.every(item => this.text(item,length)) && new Set(value).size === value.length; }
  private path(value: string): boolean { return /^[A-Za-z0-9_.@/-]+$/.test(value) && !value.startsWith("/") && value.split("/").every(part => part !== "" && part !== "." && part !== ".."); }
  private invalid(): ValidationResult<never> { return { valid: false, issues: [{ path: [], code: "INVALID_SUB_AGENT_REQUEST", message: "Sub-agent request does not satisfy the bounded contract." }] }; }
}
