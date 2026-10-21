import type { ExecutionOutcome } from "../outcomes/ExecutionOutcome.js";
import type { IResultContract } from "./IResultContract.js";
import type { ValidationResult } from "./ValidationResult.js";
import { JsonValueContract } from "../../persistence/JsonValueContract.js";
export class ExecutionOutcomeContract<TResult> implements IResultContract<ExecutionOutcome<TResult>> {
  readonly id: string; readonly version = "1";
  constructor(private readonly result: IResultContract<TResult>, private readonly json: JsonValueContract) { this.id = "execution-outcome:" + result.id; }
  async validate(raw: unknown): Promise<ValidationResult<ExecutionOutcome<TResult>>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 65536) return this.invalid();
    const row = checked.value as unknown as Record<string,unknown>;
    if (!this.object(row)) return this.invalid();
    if (row.status === "completed" && this.keys(row,["status","result"])) {
      const result = await this.result.validate(row.result); if (!result.valid) return result;
      const copy = await this.json.validate(result.value); if (!copy.valid) return this.invalid();
      const value = Object.freeze({ status: "completed" as const, result: copy.value as unknown as TResult });
      if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 65536) return this.invalid();
      return { valid: true, value };
    }
    if (row.status !== "stopped" && row.status !== "failed") return this.invalid();
    const reason = row.status === "stopped" ? row.reason : row.error;
    if (!this.keys(row,row.status === "stopped" ? ["status","reason","partial","pendingOperationRefs"] : ["status","error","partial","pendingOperationRefs"]) ||
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
    return { valid: true, value: checked.value as unknown as ExecutionOutcome<TResult> };
  }
  private object(value: unknown): value is Record<string,unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
  private keys(row: Record<string,unknown>,keys: readonly string[]): boolean { return Object.keys(row).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(row,key)); }
  private text(value: unknown,max: number): boolean { return typeof value === "string" && value.length > 0 && value.length <= max; }
  private list(value: unknown,max: number,length: number): boolean { return Array.isArray(value) && value.length <= max && value.every(item => this.text(item,length)) && new Set(value).size === value.length; }
  private invalid(): ValidationResult<never> { return { valid: false, issues: [{ path: [], code: "INVALID_EXECUTION_OUTCOME", message: "Executor outcome does not satisfy its bounded contract." }] }; }
}
