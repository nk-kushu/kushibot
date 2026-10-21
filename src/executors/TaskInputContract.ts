import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { TaskInput } from "./TaskInput.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class TaskInputContract implements IResultContract<TaskInput> {
  readonly id = "executor-task-input"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<TaskInput>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (new TextEncoder().encode(JSON.stringify(checked.value)).byteLength > 16384 ||
        row === null ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.keys(row).length !== 4 ||
        !["goal","acceptanceCriteria","sourceRefs","filePaths"].every(key => Object.prototype.hasOwnProperty.call(row,key)) ||
        typeof row.goal !== "string" ||
        !row.goal.trim() ||
        row.goal.length > 2048 ||
        !this.list(row.acceptanceCriteria,16,512) ||
        row.acceptanceCriteria.length === 0 ||
        !this.list(row.sourceRefs,16,256) ||
        !this.list(row.filePaths,16,256) ||
        !row.filePaths.every(path => /^[A-Za-z0-9_.@/-]+$/.test(path) && !path.startsWith("/") && path.split("/").every(part => part !== "" && part !== "." && part !== ".."))) return { valid: false, issues: [{ path: [], code: "INVALID_TASK_INPUT", message: "Executor task input is invalid." }] };
    return { valid: true, value: checked.value as unknown as TaskInput };
  }
  private list(value: unknown,max: number,length: number): value is readonly string[] { return Array.isArray(value) && value.length <= max && value.every(item => typeof item === "string" && item.trim().length > 0 && item.length <= length) && new Set(value).size === value.length; }
}
