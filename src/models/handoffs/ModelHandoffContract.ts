import type { IResultContract } from "../../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../../contracts/validation/ValidationResult.js";
import type { ModelHandoff } from "./ModelHandoff.js";
import { JsonValueContract } from "../../persistence/JsonValueContract.js";
import { PartialOutcomeFactory } from "../../execution-control/PartialOutcomeFactory.js";
import { ModelProfileRegistry } from "../ModelProfileRegistry.js";
import { ConfigurationError } from "../../errors/ConfigurationError.js";
import { BudgetAccountingError } from "../../errors/BudgetAccountingError.js";
export class ModelHandoffContract implements IResultContract<ModelHandoff> {
  readonly id = "model-handoff"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(input: unknown): Promise<ValidationResult<ModelHandoff>> {
    const checked = await this.json.validate(input);
    if (!checked.valid) return { valid: false, issues: checked.issues };
    const value = checked.value;
    if (!this.record(value) || Object.keys(value).sort().join(",") !== "assignment,budgetScopeId,createdAtEpochMs,deadlineEpochMs,handoffId,partial,pendingOperationRefs,permissionScopeRef,schemaVersion,scope,sourceProfile,sourceRevision,sourceSessionId,targetProfile,targetSessionId" ||
        value.schemaVersion !== 1 || !this.idValue(value.handoffId) || !this.idValue(value.sourceSessionId) || !this.idValue(value.targetSessionId) || value.sourceSessionId === value.targetSessionId ||
        !this.idValue(value.budgetScopeId) || !this.idValue(value.permissionScopeRef) || !this.idValue(value.sourceRevision) || !this.text(value.assignment, 8192) ||
        !this.time(value.createdAtEpochMs) || !(value.deadlineEpochMs === null || this.time(value.deadlineEpochMs)) ||
        !this.record(value.scope) || !this.idValue(value.scope.scopeId) || !this.idValue(value.scope.projectId) || Object.keys(value.scope).some(key => !["scopeId", "projectId", "workspaceId"].includes(key)) ||
        (value.scope.workspaceId !== undefined && !this.idValue(value.scope.workspaceId)) || !this.record(value.partial) ||
        Object.keys(value.partial).sort().join(",") !== "artifactRefs,evidenceRefs,summary,unresolved" ||
        !this.text(value.partial.summary, 4096) || !this.strings(value.partial.evidenceRefs, 256) || !this.strings(value.partial.artifactRefs, 256) || !this.strings(value.partial.unresolved, 1024) ||
        !this.strings(value.pendingOperationRefs, 256) || !this.record(value.sourceProfile) || !this.record(value.targetProfile) ||
        !this.profileKeys(value.sourceProfile) || !this.profileKeys(value.targetProfile) || new TextEncoder().encode(JSON.stringify(value)).byteLength > 65536) return this.invalid();
    const handoff = value as unknown as ModelHandoff;
    try {
      // Separate registries allow the same canonical profile for a fresh same-model session.
      new ModelProfileRegistry().register({ profile: handoff.sourceProfile, capabilities: ["text"] });
      new ModelProfileRegistry().register({ profile: handoff.targetProfile, capabilities: ["text"] });
      new PartialOutcomeFactory().stopped({ code: "limit-reached", message: "Handoff validation." }, { partial: handoff.partial, pendingOperationRefs: handoff.pendingOperationRefs });
    } catch (error) { if (error instanceof ConfigurationError || error instanceof BudgetAccountingError) return this.invalid(); throw error; }
    return { valid: true, value: handoff };
  }
  private profileKeys(value: Record<string, unknown>): boolean { return Object.keys(value).sort().join(",") === "contextTokens,id,maxOutputTokens,maxRequestBytes,maxResponseBytes,modelId,providerId,supportsPromptCacheKey"; }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
  private text(value: unknown, max: number): value is string { return typeof value === "string" && new TextEncoder().encode(value).byteLength <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value); }
  private idValue(value: unknown): value is string { return typeof value === "string" && /^[a-zA-Z0-9_.:/-]{1,128}$/.test(value); }
  private time(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000; }
  private strings(value: unknown, max: number): value is readonly string[] { return Array.isArray(value) && value.length <= 128 && value.every(item => this.text(item, max)); }
  private invalid(): ValidationResult<ModelHandoff> { return { valid: false, issues: [{ path: [], code: "invalid-handoff", message: "Model handoff snapshot is invalid or exceeds limits." }] }; }
}
