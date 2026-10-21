import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { EditingResult } from "./EditingResult.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
export class EditingResultContract implements IResultContract<EditingResult> {
  readonly id = "workspace-editing-result"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<EditingResult>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return checked;
    const row = checked.value as unknown as Record<string,unknown>;
    if (row === null ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.keys(row).length !== 6 ||
        !["summary","baseSnapshotRef","resultSnapshotRef","changedPaths","changeArtifactRefs","unresolved"].every(key => Object.prototype.hasOwnProperty.call(row,key)) ||
        !this.text(row.summary,2048) ||
        !this.text(row.baseSnapshotRef,256) ||
        !this.text(row.resultSnapshotRef,256) ||
        !this.list(row.changedPaths,16,256) ||
        !row.changedPaths.every(path => /^[A-Za-z0-9_.@/-]+$/.test(path) && !path.startsWith("/") && path.split("/").every(part => part !== "" && part !== "." && part !== "..")) ||
        !this.list(row.changeArtifactRefs,16,256) ||
        !this.list(row.unresolved,16,512) ||
        (row.changedPaths.length > 0 && (row.changeArtifactRefs.length === 0 ||
        row.baseSnapshotRef === row.resultSnapshotRef))) return {valid: false,issues: [{path: [],code: "INVALID_EDITING_RESULT",message: "Editing result is invalid."}]};
    return { valid: true, value: checked.value as unknown as EditingResult };
  }
  private text(value: unknown,max: number): boolean { return typeof value === "string" && value.trim().length > 0 && value.length <= max; }
  private list(value: unknown,max: number,length: number): value is readonly string[] { return Array.isArray(value) && value.length <= max && value.every(item => this.text(item,length)) && new Set(value).size === value.length; }
}
