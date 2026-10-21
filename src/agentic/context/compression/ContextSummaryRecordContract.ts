import type { IResultContract } from "../../../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../../../contracts/validation/ValidationResult.js";
import type { ContextSummaryRecord } from "./ContextSummaryRecord.js";
import { JsonValueContract } from "../../../persistence/JsonValueContract.js";
export class ContextSummaryRecordContract implements IResultContract<ContextSummaryRecord> {
  readonly id = "context-summary"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(raw: unknown): Promise<ValidationResult<ContextSummaryRecord>> {
    const checked = await this.json.validate(raw); if (!checked.valid) return { valid: false, issues: checked.issues };
    const data = checked.value;
    if (!this.record(data) || Object.keys(data).sort().join(",") !== "acceptanceId,acceptanceVersion,generatorId,generatorVersion,pendingOperationRefs,points,schemaVersion,scope,sourceSnapshotRef,sources,summaryId,unresolved" || data.schemaVersion !== 1 ||
        !this.idValue(data.acceptanceId) || !this.idValue(data.acceptanceVersion) || !this.idValue(data.summaryId) || !this.idValue(data.sourceSnapshotRef) || !this.idValue(data.generatorId) || !this.idValue(data.generatorVersion) || !this.record(data.scope) || !this.idValue(data.scope.scopeId) || !this.idValue(data.scope.projectId) ||
        Object.keys(data.scope).some(key => !["scopeId", "projectId", "workspaceId"].includes(key)) || (data.scope.workspaceId !== undefined && !this.idValue(data.scope.workspaceId)) ||
        !Array.isArray(data.sources) || data.sources.length < 2 || data.sources.length > 8 || data.sources.some(source => !this.record(source) || Object.keys(source).sort().join(",") !== "id,revisionRef,sourceRef" || !this.idValue(source.id) || !this.idValue(source.revisionRef) || !this.idValue(source.sourceRef)) ||
        !Array.isArray(data.points) || data.points.length < 1 || data.points.length > 8 || !this.strings(data.unresolved, 32, 1024) || !this.strings(data.pendingOperationRefs, 32, 256) || new TextEncoder().encode(JSON.stringify(data)).byteLength > 32768) return this.invalid();
    const sourceIds = new Set(data.sources.map(source => (source as { id: string }).id)); const covered = new Set<string>();
    if (sourceIds.size !== data.sources.length) return this.invalid();
    for (const point of data.points) {
      if (!this.record(point) || Object.keys(point).sort().join(",") !== "sourceIds,text" || !this.text(point.text, 8192) || !Array.isArray(point.sourceIds) || point.sourceIds.length < 1 || point.sourceIds.length > 8 || new Set(point.sourceIds).size !== point.sourceIds.length || point.sourceIds.some(id => typeof id !== "string" || !sourceIds.has(id))) return this.invalid();
      for (const id of point.sourceIds) covered.add(id as string);
    }
    return covered.size === sourceIds.size ? { valid: true, value: data as unknown as ContextSummaryRecord } : this.invalid();
  }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
  private idValue(value: unknown): value is string { return typeof value === "string" && /^[a-zA-Z0-9_.:/-]{1,256}$/.test(value); }
  private text(value: unknown, max: number): value is string { return typeof value === "string" && value.trim().length > 0 && new TextEncoder().encode(value).byteLength <= max; }
  private strings(value: unknown, maxItems: number, maxBytes: number): boolean { return Array.isArray(value) && value.length <= maxItems && value.every(item => this.text(item, maxBytes)); }
  private invalid(): ValidationResult<ContextSummaryRecord> { return { valid: false, issues: [{ path: [], code: "invalid-context-summary", message: "Saved summary structure or provenance coverage is invalid." }] }; }
}
