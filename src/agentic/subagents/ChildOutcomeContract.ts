import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome.js";
import type { IResultContract } from "../../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../../contracts/validation/ValidationResult.js";
import { JsonValueContract } from "../../persistence/JsonValueContract.js";
export class ChildOutcomeContract implements IResultContract<ExecutionOutcome<JsonValue>> {
  readonly id = "sub-agent-execution-outcome"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<ExecutionOutcome<JsonValue>>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 32768) return this.invalid();
    const row = checked.value as unknown as Record<string, unknown>;
    if (!this.object(row)) return this.invalid();
    if (row.status === "completed" && this.keys(row,["status","result"])) return { valid: true, value: checked.value as unknown as ExecutionOutcome<JsonValue> };
    if (row.status !== "stopped" && row.status !== "failed") return this.invalid();
    const reason = row.status === "stopped" ? row.reason : row.error;
    if (!this.keys(row, row.status === "stopped" ? ["status","reason","partial","pendingOperationRefs"] : ["status","error","partial","pendingOperationRefs"]) ||
        !this.object(reason) ||
        !this.keys(reason,["code","message"]) ||
        !this.text(reason.code,128) ||
        !this.text(reason.message,1024) ||
        !this.list(row.pendingOperationRefs,64,256)) return this.invalid();
    if (row.status === "stopped" && !["limit-reached","deadline-reached","cancelled","no-progress"].includes(reason.code as string)) return this.invalid();
    const partial = row.partial;
    if (!this.object(partial) ||
        !this.keys(partial,["summary","evidenceRefs","artifactRefs","unresolved"]) ||
        typeof partial.summary !== "string" ||
        partial.summary.length > 16384 ||
        !this.list(partial.evidenceRefs,32,256) ||
        !this.list(partial.artifactRefs,32,256) ||
        !this.list(partial.unresolved,32,1024)) return this.invalid();
    return { valid: true, value: checked.value as unknown as ExecutionOutcome<JsonValue> };
  }
  private object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private text(value: unknown,max: number): boolean { return typeof value === "string" && value.length > 0 && value.length <= max; }
  private list(value: unknown,max: number,length: number): boolean { return Array.isArray(value) && value.length <= max && value.every(item => this.text(item,length)) && new Set(value).size === value.length; }
  private invalid(): ValidationResult<never> { return { valid: false, issues: [{ path: [], code: "INVALID_CHILD_OUTCOME", message: "Child outcome is malformed or exceeds its bounds." }] }; }
}
